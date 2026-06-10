"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { addXpAndCheckLevelUp } from "../../firebase/gameLogic";

import { Suspense } from "react";

function ProfileContent() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const profileId = searchParams.get("id"); // Se vier ?id=xxx, exibe o perfil de outro usuário
  const isOwnProfile = !profileId || profileId === user?.uid;

  const [viewedProfile, setViewedProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("cronicas");
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Estados para edição de foto e banner
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [editingBanner, setEditingBanner] = useState(false);
  const [photoInput, setPhotoInput] = useState("");
  const [bannerInput, setBannerInput] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Carrega os dados do perfil visualizado
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        if (isOwnProfile) {
          setViewedProfile(profile);
        } else {
          const userDoc = await getDoc(doc(db, "users", profileId));
          if (userDoc.exists()) {
            setViewedProfile({ uid: userDoc.id, ...userDoc.data() });
          } else {
            setViewedProfile(null);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setViewedProfile(profile); // Fallback imediato se carregar próprio
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user, profile, profileId, isOwnProfile]);

  // Carrega os dados reais do perfil visualizado quando carregado
  useEffect(() => {
    if (!user || isOwnProfile || !profileId) return;

    const fetchTargetProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", profileId));
        if (userDoc.exists()) {
          setViewedProfile({ uid: userDoc.id, ...userDoc.data() });
        }
      } catch (err) {
        console.error("Erro ao carregar perfil externo:", err);
      }
    };
    fetchTargetProfile();
  }, [user, profileId, isOwnProfile]);

  // Verifica se o usuário logado já segue o perfil visualizado
  useEffect(() => {
    if (!user || isOwnProfile || !viewedProfile) return;
    const followers = viewedProfile.followers || [];
    setIsFollowing(followers.includes(user.uid));
  }, [user, viewedProfile, isOwnProfile]);

  // Carrega os posts do perfil visualizado
  useEffect(() => {
    if (!viewedProfile) return;
    const targetId = isOwnProfile ? user.uid : profileId;

    const loadPosts = async () => {
      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("authorId", "==", targetId),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(postsQuery);
        setUserPosts(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      } catch (err) {
        console.error("Erro ao carregar crônicas do perfil:", err);
      }
    };

    loadPosts();
  }, [viewedProfile, user, profileId, isOwnProfile]);

  // Seguir / Deixar de seguir
  const handleFollowToggle = async () => {
    if (!user || !profileId) return;

    const myRef = doc(db, "users", user.uid);
    const targetRef = doc(db, "users", profileId);

    try {
      if (isFollowing) {
        await updateDoc(myRef, { following: arrayRemove(profileId) });
        await updateDoc(targetRef, { followers: arrayRemove(user.uid) });
        setIsFollowing(false);
        setViewedProfile((prev) => ({
          ...prev,
          followers: (prev.followers || []).filter((f) => f !== user.uid),
        }));
      } else {
        await updateDoc(myRef, { following: arrayUnion(profileId) });
        await updateDoc(targetRef, { followers: arrayUnion(user.uid) });
        await addXpAndCheckLevelUp(profileId, 5);
        setIsFollowing(true);
        setViewedProfile((prev) => ({
          ...prev,
          followers: [...(prev.followers || []), user.uid],
        }));

        // Cria notificação para quem foi seguido
        await addDoc(collection(db, "notifications"), {
          targetUserId: profileId,
          fromUserId: user.uid,
          fromUserName: profile?.displayName || "Alguém",
          type: "follow",
          message: `${profile?.displayName || "Alguém"} começou a seguir você!`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Erro ao alterar seguimento:", err);
    }
  };

  // Salvar URL da foto de perfil
  const handleSavePhoto = async () => {
    if (!photoInput.trim()) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { photoURL: photoInput });
      setEditingPhoto(false);
      setPhotoInput("");
    } catch (err) {
      console.error("Erro ao atualizar foto:", err);
    }
  };

  // Salvar URL do banner
  const handleSaveBanner = async () => {
    if (!bannerInput.trim()) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { bannerURL: bannerInput });
      setEditingBanner(false);
      setBannerInput("");
    } catch (err) {
      console.error("Erro ao atualizar banner:", err);
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-500 font-serif">
        <p className="text-2xl animate-pulse">Decifrando Pergaminho...</p>
      </div>
    );
  }

  if (!viewedProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-red-400 font-serif">
        <p className="text-xl">Escriba não encontrado nos registros do Éter.</p>
      </div>
    );
  }

  const xpPercentage = Math.min(
    100,
    Math.max(
      0,
      (viewedProfile.currentXp / viewedProfile.xpNeededForNextLevel) * 100
    )
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* BANNER */}
      <div className="relative w-full h-52 md:h-64 bg-gradient-to-r from-purple-950 to-indigo-950 overflow-hidden group">
        {viewedProfile.bannerURL && (
          <img
            src={viewedProfile.bannerURL}
            alt="Banner"
            className="w-full h-full object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />

        {/* Botão editar banner */}
        {isOwnProfile && !editingBanner && (
          <button
            onClick={() => {
              setEditingBanner(true);
              setBannerInput(viewedProfile.bannerURL || "");
            }}
            className="absolute top-3 right-3 bg-slate-900/70 hover:bg-slate-800 text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ✏️ Editar Banner
          </button>
        )}

        {/* Formulário de edição do banner inline */}
        {editingBanner && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-slate-900/90 flex gap-2 items-center z-20">
            <input
              type="text"
              placeholder="Cole a URL da imagem do banner..."
              value={bannerInput}
              onChange={(e) => setBannerInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-purple-500/20 rounded-lg p-2 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
            <button
              onClick={handleSaveBanner}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg"
            >
              Salvar
            </button>
            <button
              onClick={() => setEditingBanner(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* ÁREA DO PERFIL */}
      <div className="max-w-3xl mx-auto px-4 -mt-16 relative z-10">
        {/* Foto de Perfil */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-slate-950 bg-slate-900 overflow-hidden shadow-[0_0_25px_rgba(168,85,247,0.2)]">
              {viewedProfile.photoURL ? (
                <img
                  src={viewedProfile.photoURL}
                  alt="Foto"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-tr from-amber-600 to-purple-700">
                  {viewedProfile.displayName
                    ? viewedProfile.displayName.substring(0, 2).toUpperCase()
                    : "📜"}
                </div>
              )}
            </div>

            {/* Botão editar foto */}
            {isOwnProfile && !editingPhoto && (
              <button
                onClick={() => {
                  setEditingPhoto(true);
                  setPhotoInput(viewedProfile.photoURL || "");
                }}
                className="absolute -bottom-1 -right-1 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold w-8 h-8 rounded-full border border-amber-500/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✏️
              </button>
            )}
          </div>

          <div className="flex-1 text-center md:text-left pb-4">
            <h1 className="text-2xl font-extrabold text-amber-400 font-serif tracking-wide">
              {viewedProfile.displayName}
            </h1>
            <div className="flex items-center gap-2 justify-center md:justify-start mt-1">
              <span className="text-[10px] bg-purple-950/80 border border-purple-500/30 px-2 py-0.5 rounded text-purple-300 font-semibold uppercase tracking-wider">
                {viewedProfile.title}
              </span>
              <span className="text-xs text-slate-500">
                Nível {viewedProfile.level}
              </span>
              {viewedProfile.faction && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                    viewedProfile.faction === "Luz"
                      ? "bg-amber-500/10 border-amber-400/30 text-amber-400"
                      : "bg-purple-900/30 border-purple-500/30 text-purple-400"
                  }`}
                >
                  {viewedProfile.faction === "Luz" ? "☀️" : "🌑"}{" "}
                  {viewedProfile.faction}
                </span>
              )}
            </div>
          </div>

          {/* Botão Seguir / Deixar de Seguir */}
          {!isOwnProfile && (
            <button
              onClick={handleFollowToggle}
              className={`px-5 py-2 rounded-xl font-bold text-xs transition-all border ${
                isFollowing
                  ? "bg-slate-950 text-red-400 border-red-500/20 hover:bg-red-950/20"
                  : "bg-gradient-to-r from-amber-600 to-purple-600 text-white border-transparent hover:from-amber-500 hover:to-purple-500"
              }`}
            >
              {isFollowing ? "Deixar de Seguir" : "Seguir Escriba"}
            </button>
          )}
        </div>

        {/* Formulário de edição da foto inline */}
        {editingPhoto && (
          <div className="mt-3 p-3 bg-slate-900 border border-purple-500/10 rounded-xl flex gap-2 items-center">
            <input
              type="text"
              placeholder="Cole a URL da imagem de perfil..."
              value={photoInput}
              onChange={(e) => setPhotoInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-purple-500/20 rounded-lg p-2 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
            <button
              onClick={handleSavePhoto}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg"
            >
              Salvar
            </button>
            <button
              onClick={() => setEditingPhoto(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Contadores de Seguidores / Seguindo */}
        <div className="flex items-center gap-6 mt-5 justify-center md:justify-start">
          <div className="text-center">
            <span className="text-lg font-extrabold text-slate-100">
              {viewedProfile.followers?.length || 0}
            </span>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Seguidores
            </span>
          </div>
          <div className="text-center">
            <span className="text-lg font-extrabold text-slate-100">
              {viewedProfile.following?.length || 0}
            </span>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Seguindo
            </span>
          </div>
          <div className="text-center">
            <span className="text-lg font-extrabold text-amber-400">
              {userPosts.length}
            </span>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Crônicas
            </span>
          </div>
        </div>

        {/* SISTEMA DE ABAS */}
        <div className="mt-8 border-b border-purple-500/10">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab("cronicas")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === "cronicas"
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              📜 Minhas Crônicas
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === "stats"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              📊 Estatísticas
            </button>
          </div>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="mt-6 pb-16 space-y-4">
          {activeTab === "cronicas" && (
            <>
              {userPosts.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-purple-500/10 rounded-2xl text-slate-500 italic text-sm">
                  Nenhuma crônica registrada por este escriba.
                </div>
              ) : (
                userPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-slate-900/40 border border-slate-900 hover:border-purple-500/10 rounded-2xl p-5 transition-all space-y-2"
                  >
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {post.content}
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-slate-600 pt-2 border-t border-purple-950/10">
                      <span>
                        {post.createdAt
                          ? new Date(
                              post.createdAt.seconds
                                ? post.createdAt.seconds * 1000
                                : post.createdAt
                            ).toLocaleString("pt-BR")
                          : "..."}
                      </span>
                      <span className="text-amber-500 font-bold">
                        🔥 {post.upvotes?.length || 0} reconhecimentos
                      </span>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === "stats" && (
            <div className="space-y-6">
              {/* Card de Progresso Detalhado */}
              <div className="bg-slate-900/60 border border-purple-500/10 rounded-2xl p-6 space-y-5">
                <h4 className="text-amber-400 font-serif font-bold text-lg">
                  Progresso do Escriba
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-3xl font-extrabold text-amber-400 font-serif">
                      {viewedProfile.level}
                    </span>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">
                      Nível Atual
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-3xl font-extrabold text-purple-400 font-serif">
                      {viewedProfile.currentXp}
                    </span>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">
                      XP Atual
                    </p>
                  </div>
                </div>

                {/* Barra de XP Detalhada */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400 font-semibold">
                    <span>
                      Nível {viewedProfile.level} → Nível{" "}
                      {viewedProfile.level + 1}
                    </span>
                    <span>
                      {viewedProfile.currentXp} /{" "}
                      {viewedProfile.xpNeededForNextLevel} XP
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden border border-purple-500/10 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-400 h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${xpPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 italic text-center">
                    Faltam{" "}
                    {viewedProfile.xpNeededForNextLevel -
                      viewedProfile.currentXp}{" "}
                    XP para alcançar o próximo plano
                  </p>
                </div>

                {/* Info extra */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="text-center">
                    <span className="text-sm font-bold text-slate-200">
                      {viewedProfile.unlockedThemes?.length || 1}
                    </span>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">
                      Temas
                    </p>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-slate-200">
                      {userPosts.length}
                    </span>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">
                      Crônicas
                    </p>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-slate-200">
                      {viewedProfile.inventory?.length || 0}
                    </span>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">
                      Insígnias
                    </p>
                  </div>
                </div>
              </div>

              {/* Insígnias / Badges */}
              <div className="bg-slate-900/60 border border-purple-500/10 rounded-2xl p-6">
                <h4 className="text-purple-400 font-serif font-bold text-lg mb-4">
                  Insígnias Obtidas
                </h4>
                {viewedProfile.inventory &&
                viewedProfile.inventory.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {viewedProfile.inventory.map((badge, index) => (
                      <div
                        key={index}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center hover:border-amber-500/30 transition-all"
                      >
                        <span className="text-2xl">{badge.icon || "🏆"}</span>
                        <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                          {badge.name || badge}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 italic text-center py-6">
                    Nenhuma insígnia conquistada ainda. Continue sua jornada!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botão de voltar ao Feed */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 bg-slate-900/90 backdrop-blur-sm border border-amber-500/20 rounded-full text-xs font-bold text-amber-400 hover:text-amber-300 shadow-lg transition-all"
          >
            ← Voltar ao Códice
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-500 font-serif">
        <p className="text-2xl animate-pulse">Invocando Grimório...</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
