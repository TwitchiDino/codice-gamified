"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  limit,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { addXpAndCheckLevelUp } from "../firebase/gameLogic";
import Notifications from "../components/Notifications";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [postContent, setPostContent] = useState("");
  const [posts, setPosts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Controle de Tema Dinâmico Místico
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch de posts (revalidação manual/automática)
  const fetchPosts = async () => {
    if (!user) return;
    try {
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const querySnapshot = await getDocs(postsQuery);
      const postsData = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setPosts(postsData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Erro ao ler grimório no éter:", err);
    }
  };

  useEffect(() => {
    if (user) fetchPosts();
  }, [user]);

  // Revalidação automática a cada 5 minutos
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchPosts();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() || postContent.length > 280) return;
    setSubmitting(true);

    try {
      await addDoc(collection(db, "posts"), {
        authorId: user.uid,
        authorName:
          profile?.displayName || user.displayName || "Escriba Anônimo",
        authorTitle: profile?.title || "Aprendiz de Escriba",
        authorPhoto: profile?.photoURL || "",
        content: postContent,
        createdAt: new Date(),
        upvotes: [],
      });

      await addXpAndCheckLevelUp(user.uid, 15);
      setPostContent("");
      await fetchPosts();
    } catch (err) {
      console.error("Erro ao conjurar sussurro:", err);
      alert("Falha ao gravar crônica no grimório.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (
    postId,
    postAuthorId,
    postAuthorName,
    upvotesList = []
  ) => {
    if (!user) return;

    const hasAlreadyVoted = upvotesList.includes(user.uid);
    const postRef = doc(db, "posts", postId);

    try {
      if (hasAlreadyVoted) {
        await updateDoc(postRef, { upvotes: arrayRemove(user.uid) });
      } else {
        await updateDoc(postRef, { upvotes: arrayUnion(user.uid) });

        if (user.uid !== postAuthorId) {
          await addXpAndCheckLevelUp(user.uid, 2);
          await addXpAndCheckLevelUp(postAuthorId, 10);

          // Cria notificação de upvote para o autor do post
          await addDoc(collection(db, "notifications"), {
            targetUserId: postAuthorId,
            fromUserId: user.uid,
            fromUserName: profile?.displayName || "Alguém",
            type: "upvote",
            message: `${profile?.displayName || "Alguém"} reconheceu sua crônica! (+10 XP)`,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Atualiza a lista localmente para resposta visual fluida
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const updatedUpvotes = hasAlreadyVoted
              ? upvotesList.filter((uid) => uid !== user.uid)
              : [...upvotesList, user.uid];
            return { ...post, upvotes: updatedUpvotes };
          }
          return post;
        })
      );
    } catch (err) {
      console.error("Erro ao aplicar voto rúnico:", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-500 font-serif">
        <div className="text-center">
          <p className="text-2xl animate-pulse">Sintonizando Grimório...</p>
        </div>
      </div>
    );
  }

  const userLevel = profile.level || 1;
  const isLevel5Plus = userLevel >= 5;
  const isLevel10Plus = userLevel >= 10;
  const isLevel100Plus = userLevel >= 100;
  const isLevel200Plus = userLevel >= 200;

  const xpPercentage = Math.min(
    100,
    Math.max(0, (profile.currentXp / profile.xpNeededForNextLevel) * 100)
  );

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row transition-colors duration-500 relative overflow-x-hidden ${
        isLightMode ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"
      }`}
    >
      {/* ELEMENTOS VISUAIS DINÂMICOS SECRETOS (MECÂNICA BASEADA NO NÍVEL E MODO) */}
      
      {/* LEVEL 1-4 ou padrão de fundo */}
      {isLightMode ? (
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
          <svg
            className="absolute top-10 left-10 w-48 h-48 text-amber-600 animate-spin-slow"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeDasharray="4,4"
            />
            <path
              d="M50 5 L50 95 M5 50 L95 50 M18 18 L82 82 M18 82 L82 18"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle
              cx="50"
              cy="50"
              r="15"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
          <div className="absolute right-20 bottom-20 text-amber-700 text-7xl font-serif select-none font-bold opacity-30">
            ☉ ☼ ⚜ 🕇
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
          <div className="absolute w-[500px] h-[500px] bg-purple-900/10 rounded-full filter blur-[120px] -top-50 -left-50 animate-pulse" />
          <div className="absolute w-[500px] h-[500px] bg-indigo-950/20 rounded-full filter blur-[100px] -bottom-50 -right-50" />
          <svg
            className="absolute bottom-16 left-16 w-64 h-64 text-indigo-500/20"
            viewBox="0 0 100 100"
          >
            <path
              d="M10 20 L30 40 L60 30 L90 70 M60 30 L80 15"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
            />
            <circle
              cx="10"
              cy="20"
              r="2"
              fill="currentColor"
              className="animate-ping"
            />
            <circle cx="30" cy="40" r="3" fill="currentColor" />
            <circle cx="60" cy="30" r="2" fill="currentColor" />
            <circle cx="80" cy="15" r="2.5" fill="currentColor" />
            <circle
              cx="90"
              cy="70"
              r="3.5"
              fill="currentColor"
              className="animate-pulse"
            />
          </svg>
          <div className="absolute right-10 top-1/4 text-indigo-950 text-9xl font-serif select-none font-bold rotate-12">
            𓆙 𓋹 𓀿 𓁏
          </div>
        </div>
      )}

      {/* REVELAÇÃO DO LEVEL 5+ (Escriba Real) */}
      {isLevel5Plus && (
        <>
          {isLightMode ? (
            /* Runas de Luz brilhando nas bordas da tela */
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              <div className="absolute top-4 right-4 text-amber-500 text-lg font-bold font-serif opacity-80 animate-pulse-runes">
                ᚛ ᚌ ᚎ ᚏ ᚐ ᚑ
              </div>
              <div className="absolute bottom-4 left-4 text-amber-500 text-lg font-bold font-serif opacity-80 animate-pulse-runes">
                ᚔ ᚕ ᚖ ᚗ ᚘ ᚙ
              </div>
            </div>
          ) : (
            /* Névoa móvel e olhos ocultos */
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-indigo-950/20 via-transparent to-transparent animate-drift-fog">
              {/* Olhos nas Sombras piscando */}
              <div className="absolute top-1/3 right-1/4 flex gap-4 opacity-0 animate-blink-eyes">
                <div className="w-3 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <div className="w-3 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </div>
              <div className="absolute bottom-1/4 left-1/3 flex gap-4 opacity-0 animate-blink-eyes" style={{ animationDelay: "4s" }}>
                <div className="w-2 h-1 bg-amber-400 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                <div className="w-2 h-1 bg-amber-400 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              </div>
            </div>
          )}
        </>
      )}

      {/* REVELAÇÃO DO LEVEL 10+ (Arquivista Cósmico) */}
      {isLevel10Plus && (
        <>
          {isLightMode ? (
            /* Constelações Diurnas nas laterais interativas */
            <div className="absolute left-4 top-1/3 pointer-events-auto z-20 flex flex-col gap-2 group cursor-pointer">
              <div className="text-amber-500 hover:text-purple-600 transition-colors duration-300 font-serif text-sm opacity-60 hover:opacity-100 hover:scale-125 transform">
                ✨ ✦ ☄ 𓂉
              </div>
              <div className="text-[9px] text-amber-600/50 hidden group-hover:block font-serif bg-white/90 border border-amber-300/30 p-1.5 rounded-lg shadow-sm">
                Conexão Cósmica Estável
              </div>
            </div>
          ) : (
            /* Fenda Interdimensional animada atrás do feed */
            <div className="absolute inset-y-0 right-0 w-96 pointer-events-none opacity-25 bg-gradient-to-l from-purple-800 via-pink-700 to-transparent animate-shift-fenda blur-3xl -z-10" />
          )}
        </>
      )}

      {/* REVELAÇÃO DO LEVEL 100 & 200 (ENDGAME CUTSCENE & ENIGMA) */}
      {isLevel100Plus && (
        <div className="fixed inset-x-0 top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-amber-500/30 p-4 shadow-[0_4px_30px_rgba(245,158,11,0.15)] flex flex-col items-center justify-center animate-pulse-runes">
          <div className="max-w-2xl text-center space-y-3">
            <span className="text-[10px] font-bold text-red-500 tracking-[0.3em] uppercase block">
              ⚠️ Alerta de Sobrecarga Arcana ⚠️
            </span>
            
            {/* Animação de convergência rúnica */}
            <div className="flex justify-center gap-6 text-xl font-serif text-amber-400 animate-collapse-nexus my-2">
              <span>᚛</span>
              <span>⚡</span>
              <span>ᚙ</span>
            </div>

            <div className="bg-black/80 border border-purple-500/20 p-4 rounded-xl font-mono text-sm leading-relaxed text-purple-400 shadow-inner">
              {!isLevel200Plus ? (
                /* Level 100 a 199: Texto Codificado */
                <p className="animate-pulse tracking-wide">
                  [NEXUS_INIT] ⚡ O7_S1ST3M4_V1V3_N0S_GL1F0S... 🌐 [STACK_OVERFLOW_SOUL]
                </p>
              ) : (
                /* Level 200+: Tradução de forma gradual */
                <div className="space-y-1.5 text-amber-300 text-left font-serif text-sm">
                  <p className="animate-fade-in transition-opacity duration-1000">
                    <span className="text-red-500 font-mono text-xs mr-2">[NEXUS DECODIFICADO]</span>
                    [NEXUS INICIADO]
                  </p>
                  <p className="animate-fade-in transition-opacity duration-1000 delay-500">
                    ⚡ O sistema vive nos glifos. Toda linha escrita é eterna.
                  </p>
                  <p className="animate-fade-in transition-opacity duration-1000 delay-1000 text-emerald-400 font-bold">
                    A eternidade foi compilada com sucesso. 🌐 [ALMA OVERFLOW]
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside
        className={`w-full md:w-80 border-b md:border-b-0 md:border-r transition-all duration-300 p-6 flex flex-col justify-between md:h-screen md:sticky md:top-0 z-10 ${
          isLightMode
            ? "bg-white border-slate-200 shadow-md"
            : "bg-slate-900 border-amber-500/20 shadow-none"
        } ${isLevel10Plus && isLightMode ? "ring-2 ring-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : ""}`}
      >
        <div className="space-y-6">
          {/* Header: Facção, Tema Toggle e Notificações */}
          <div className="flex justify-between items-center pb-2 border-b border-purple-500/10">
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Facção:{" "}
              <span
                className={
                  profile.faction === "Luz"
                    ? "text-amber-500"
                    : "text-purple-400"
                }
              >
                {profile.faction || "N/A"}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Notifications />
              <button
                onClick={() => setIsLightMode(!isLightMode)}
                className={`p-1.5 rounded-full border transition-all ${
                  isLightMode
                    ? "bg-amber-100 border-amber-400 text-amber-600"
                    : "bg-purple-950/80 border-purple-500 text-purple-300"
                }`}
                title={
                  isLightMode
                    ? "Ativar Modo Escuro (Trevas)"
                    : "Ativar Modo Claro (Luz)"
                }
              >
                {isLightMode ? "☀️" : "🌑"}
              </button>
            </div>
          </div>

          {/* Avatar */}
          <div
            className="text-center pb-6 cursor-pointer"
            onClick={() => router.push("/profile")}
          >
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg border-2 overflow-hidden bg-slate-950 border-amber-400 hover:border-purple-500 transition-all">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt="Foto"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl">📜</span>
              )}
            </div>
            <h2
              className={`mt-4 text-xl font-extrabold tracking-wide font-serif ${
                isLightMode ? "text-slate-800" : "text-amber-400"
              }`}
            >
              {profile.displayName}
            </h2>
            <p className="text-xs font-semibold tracking-widest text-purple-500 uppercase mt-1">
              ✨ {profile.title}
            </p>
            <p className="text-[9px] text-slate-500 mt-1 hover:text-amber-400 transition-all">
              Ver Perfil Completo →
            </p>
          </div>

          {/* Barra de XP */}
          <div
            className={`p-4 rounded-xl border space-y-4 ${
              isLightMode
                ? "bg-slate-50 border-slate-200"
                : "bg-slate-950/60 border-purple-500/10"
            }`}
          >
            <div className="flex justify-between items-center">
              <span
                className={`text-sm font-bold font-serif ${
                  isLightMode ? "text-slate-700" : "text-amber-400"
                }`}
              >
                Nível Místico
              </span>
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {profile.level}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                <span>Experiência</span>
                <span>
                  {profile.currentXp} / {profile.xpNeededForNextLevel} XP
                </span>
              </div>
              <div
                className={`w-full h-3.5 rounded-full overflow-hidden border shadow-inner ${
                  isLightMode
                    ? "bg-slate-200 border-slate-300"
                    : "bg-slate-900 border-purple-500/10"
                }`}
              >
                <div
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-400 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-500 italic">
              Faltam {profile.xpNeededForNextLevel - profile.currentXp} XP para
              evoluir
            </p>
          </div>

          <div className="text-xs text-slate-400 space-y-2.5 px-2">
            <div className="flex justify-between">
              <span>Seguidores:</span>
              <span className="text-purple-500 font-bold">
                {profile.followers?.length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Seguindo:</span>
              <span className="text-purple-500 font-bold">
                {profile.following?.length || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <button
            onClick={fetchPosts}
            className={`w-full py-2 border rounded-xl transition-all duration-300 text-xs font-bold font-serif ${
              isLightMode
                ? "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                : "bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800 hover:border-amber-400/20"
            }`}
          >
            🔄 Sincronizar Éter
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-red-950/10 hover:bg-red-950/20 text-red-500/80 hover:text-red-400 border border-red-500/10 hover:border-red-500/20 rounded-xl transition-all duration-300 text-xs font-bold font-serif"
          >
            Fechar Grimório (Sair)
          </button>
        </div>
      </aside>

      {/* FEED */}
      <main className={`flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 md:p-8 space-y-6 z-10 ${isLevel100Plus ? "mt-44" : ""}`}>
        {/* Editor de Postagem */}
        <div
          className={`border rounded-2xl p-5 shadow-lg backdrop-blur-sm transition-all duration-300 ${
            isLightMode
              ? "bg-white/80 border-slate-200"
              : "bg-slate-900/80 border-purple-500/10"
          }`}
        >
          <h3
            className={`font-serif font-bold text-lg mb-3 flex items-center gap-2 ${
              isLightMode ? "text-slate-800" : "text-amber-400"
            }`}
          >
            ✍️ Registrar Nova Crônica
          </h3>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <textarea
              maxLength={280}
              rows={3}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Escreva seus sussurros místicos ou sabedorias..."
              className={`w-full border rounded-xl p-3 placeholder-slate-500 outline-none resize-none transition-all text-sm leading-relaxed ${
                isLightMode
                  ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
                  : "bg-slate-950 border-purple-500/20 text-slate-200 focus:border-amber-400"
              }`}
            />
            <div className="flex justify-between items-center text-xs">
              <span
                className={`font-semibold ${
                  postContent.length > 250 ? "text-amber-500" : "text-slate-500"
                }`}
              >
                {postContent.length} / 280 caracteres
              </span>
              <button
                type="submit"
                disabled={submitting || !postContent.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-xl transition-all shadow-[0_4px_12px_rgba(109,40,217,0.3)] disabled:opacity-50 disabled:cursor-not-allowed font-serif text-xs uppercase tracking-wider"
              >
                {submitting ? "Gravando..." : "Sussurrar (+15 XP)"}
              </button>
            </div>
          </form>
        </div>

        {/* Feed */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2 border-purple-950/40">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Sussurros do Éter
            </h3>
            {lastRefreshed && (
              <span className="text-[10px] text-slate-500">
                Sincronizado: {lastRefreshed.toLocaleTimeString("pt-BR")}
              </span>
            )}
          </div>

          {posts.length === 0 ? (
            <div
              className={`text-center py-12 border border-dashed rounded-2xl italic text-sm ${
                isLightMode
                  ? "border-slate-300 text-slate-400"
                  : "border-purple-500/10 text-slate-500"
              }`}
            >
              Nenhuma crônica foi registrada ainda. Compartilhe seu primeiro
              sussurro!
            </div>
          ) : (
            posts.map((post) => {
              const isUpvoted = post.upvotes?.includes(user?.uid);
              const upvoteCount = post.upvotes?.length || 0;

              return (
                <div
                  key={post.id}
                  className={`border rounded-2xl p-5 transition-all duration-300 shadow-sm relative overflow-hidden ${
                    isLightMode
                      ? "bg-white border-slate-100 hover:border-purple-400"
                      : "bg-slate-900/40 border-slate-900 hover:border-purple-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar do Autor */}
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden bg-slate-950 border border-amber-500 flex-shrink-0 cursor-pointer hover:border-purple-500 transition-all"
                      onClick={() =>
                        router.push(`/profile?id=${post.authorId}`)
                      }
                    >
                      {post.authorPhoto ? (
                        <img
                          src={post.authorPhoto}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl flex items-center justify-center h-full">
                          📜
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold text-sm transition-all hover:text-purple-500 cursor-pointer ${
                                isLightMode ? "text-slate-800" : "text-slate-200"
                              }`}
                              onClick={() =>
                                router.push(`/profile?id=${post.authorId}`)
                              }
                            >
                              {post.authorName}
                            </span>
                            <span className="text-[9px] bg-purple-950/80 border border-purple-500/30 px-2 py-0.5 rounded text-purple-300 font-semibold uppercase tracking-wider">
                              {post.authorTitle}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500 font-medium">
                            {post.createdAt
                              ? new Date(
                                  post.createdAt.seconds
                                    ? post.createdAt.seconds * 1000
                                    : post.createdAt
                                ).toLocaleString("pt-BR")
                              : "Sincronizando..."}
                          </span>
                        </div>
                      </div>

                      {/* CONTEÚDO OCULTO / REVELAÇÃO DO LEVEL 10+ */}
                      {post.content && post.content.includes("[OCULTO]") && !isLevel10Plus ? (
                        /* Usuários < 10 vêem o texto borrado e ilegível */
                        <p className="text-sm italic select-none blur-sm opacity-30 text-slate-500">
                          {post.content.replace("[OCULTO]", "Texto ocultado pelas correntes do vácuo cósmico...")}
                        </p>
                      ) : (
                        /* Usuários level 10+ ou posts normais */
                        <p
                          className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isLightMode ? "text-slate-700" : "text-slate-300"
                          }`}
                        >
                          {post.content.replace("[OCULTO]", "🔓 [REVELADO DO VÁCUO]: ")}
                        </p>
                      )}

                      <div className="flex items-center pt-2 border-t border-purple-950/10">
                        <button
                          onClick={() =>
                            handleUpvote(
                              post.id,
                              post.authorId,
                              post.authorName,
                              post.upvotes
                            )
                          }
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isUpvoted
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                              : "bg-slate-950/50 hover:bg-slate-950 text-slate-500 hover:text-amber-500 border border-slate-900 hover:border-amber-500/20"
                          }`}
                        >
                          <span className="text-sm">🔥</span>
                          <span>
                            {upvoteCount}{" "}
                            {isUpvoted ? "Reconhecido" : "Reconhecer"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Roda-pé secreto da Luz para Level 5+ em modo Claro */}
      {isLevel5Plus && isLightMode && (
        <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm border-t border-amber-200/50 py-2 text-center text-xs text-amber-600 font-serif font-bold shadow-md z-30 animate-pulse">
          ☀️ Você começou a enxergar a assinatura da Luz...
        </div>
      )}
    </div>
  );
}
