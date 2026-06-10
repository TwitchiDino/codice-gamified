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
  limit
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { addXpAndCheckLevelUp } from "../firebase/gameLogic";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [postContent, setPostContent] = useState("");
  const [posts, setPosts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  
  // Controle de Tema Dinâmico Místico: Luz (Claro) vs Trevas (Escuro)
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Função para carregar posts (Revalidação via Pull/Fetch manual/automático)
  const fetchPosts = async () => {
    if (!user) return;
    try {
      const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100));
      const querySnapshot = await getDocs(postsQuery);
      const postsData = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setPosts(postsData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Erro ao ler grimório no éter:", err);
    }
  };

  // Carrega posts inicialmente
  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  // Sistema de Revalidação de Feed automática a cada 5 minutos (300.000 ms)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      console.log("Revalidando sussurros a cada 5 minutos...");
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
        authorName: profile?.displayName || user.displayName || "Escriba Anônimo",
        authorTitle: profile?.title || "Aprendiz de Escriba",
        authorPhoto: profile?.photoURL || "",
        content: postContent,
        createdAt: new Date(), // Usado Date direto para possibilitar fetch local preciso offline
        upvotes: []
      });

      await addXpAndCheckLevelUp(user.uid, 15);
      setPostContent("");
      await fetchPosts(); // Atualiza feed instantaneamente para quem escreveu
    } catch (err) {
      console.error("Erro ao conjurar sussurro:", err);
      alert("Falha ao gravar crônica no grimório.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (postId, postAuthorId, upvotesList = []) => {
    if (!user) return;
    
    const hasAlreadyVoted = upvotesList.includes(user.uid);
    const postRef = doc(db, "posts", postId);

    try {
      if (hasAlreadyVoted) {
        await updateDoc(postRef, {
          upvotes: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          upvotes: arrayUnion(user.uid)
        });

        if (user.uid !== postAuthorId) {
          await addXpAndCheckLevelUp(user.uid, 2);
          await addXpAndCheckLevelUp(postAuthorId, 10);
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

  const xpPercentage = Math.min(
    100,
    Math.max(0, (profile.currentXp / profile.xpNeededForNextLevel) * 100)
  );

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-500 relative ${
      isLightMode 
        ? "bg-slate-100 text-slate-900" 
        : "bg-slate-950 text-slate-100"
    }`}>
      
      {/* ========================================================
          ELEMENTOS VISUAIS DINÂMICOS SECRETOS (SVG / CSS)
          ======================================================== */}
      {isLightMode ? (
        // MODO CLARO (LUZ): Exibe detalhes sutis de constelações solares e runas divinas
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
          <svg className="absolute top-10 left-10 w-48 h-48 text-amber-600 animate-spin-slow" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4,4" />
            <path d="M50 5 L50 95 M5 50 L95 50 M18 18 L82 82 M18 82 L82 18" stroke="currentColor" strokeWidth="1" />
            <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <div className="absolute right-20 bottom-20 text-amber-700 text-7xl font-serif select-none font-bold opacity-30">
            ☉ ☼ ⚜ 🕇
          </div>
        </div>
      ) : (
        // MODO ESCURO (TREVAS): Oculta constelações e revela névoa de criaturas místicas e estrelas secretas no breu
        <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
          <div className="absolute w-[500px] h-[500px] bg-purple-900/10 rounded-full filter blur-[120px] -top-50 -left-50 animate-pulse" />
          <div className="absolute w-[500px] h-[500px] bg-indigo-950/20 rounded-full filter blur-[100px] -bottom-50 -right-50" />
          {/* Constelação Obscura Secreta */}
          <svg className="absolute bottom-16 left-16 w-64 h-64 text-indigo-500/20" viewBox="0 0 100 100">
            <path d="M10 20 L30 40 L60 30 L90 70 M60 30 L80 15" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <circle cx="10" cy="20" r="2" fill="currentColor" className="animate-ping" />
            <circle cx="30" cy="40" r="3" fill="currentColor" />
            <circle cx="60" cy="30" r="2" fill="currentColor" />
            <circle cx="80" cy="15" r="2.5" fill="currentColor" />
            <circle cx="90" cy="70" r="3.5" fill="currentColor" className="animate-pulse" />
          </svg>
          <div className="absolute right-10 top-1/4 text-indigo-950 text-9xl font-serif select-none font-bold select-none rotate-12">
            𓆙 𓋹 𓀿 𓁏
          </div>
        </div>
      )}

      {/* 1. LADO ESQUERDO / TOPO: PAINEL DO ESCRIBA */}
      <aside className={`w-full md:w-80 border-b md:border-b-0 md:border-r transition-all duration-300 p-6 flex flex-col justify-between md:h-screen md:sticky md:top-0 z-10 ${
        isLightMode 
          ? "bg-white border-slate-200 shadow-md" 
          : "bg-slate-900 border-amber-500/20 shadow-none"
      }`}>
        <div className="space-y-6">
          
          {/* Header da Facção */}
          <div className="flex justify-between items-center pb-2 border-b border-purple-500/10">
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Facção: <span className={profile.faction === "Luz" ? "text-amber-500" : "text-purple-400"}>{profile.faction || "Sem Alinhamento"}</span>
            </span>
            {/* Toggle Switch de Luz vs Trevas */}
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className={`p-1.5 rounded-full border transition-all ${
                isLightMode 
                  ? "bg-amber-100 border-amber-400 text-amber-600" 
                  : "bg-purple-950/80 border-purple-500 text-purple-300"
              }`}
              title={isLightMode ? "Ativar Modo Escuro (Trevas)" : "Ativar Modo Claro (Luz)"}
            >
              {isLightMode ? "☀️" : "🌑"}
            </button>
          </div>
          
          <div className="text-center pb-6">
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg border-2 overflow-hidden bg-slate-950 border-amber-400">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="Foto de Perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">📜</span>
              )}
            </div>
            <h2 className={`mt-4 text-xl font-extrabold tracking-wide font-serif ${isLightMode ? 'text-slate-800' : 'text-amber-400'}`}>
              {profile.displayName}
            </h2>
            <p className="text-xs font-semibold tracking-widest text-purple-500 uppercase mt-1">
              ✨ {profile.title}
            </p>
          </div>

          {/* Gamificação / Nível e Barra de XP */}
          <div className={`p-4 rounded-xl border space-y-4 ${
            isLightMode 
              ? "bg-slate-50 border-slate-200" 
              : "bg-slate-950/60 border-purple-500/10"
          }`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm font-bold font-serif ${isLightMode ? 'text-slate-700' : 'text-amber-400'}`}>Nível Místico</span>
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {profile.level}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                <span>Experiência</span>
                <span>{profile.currentXp} / {profile.xpNeededForNextLevel} XP</span>
              </div>

              <div className={`w-full h-3.5 rounded-full overflow-hidden border shadow-inner ${
                isLightMode ? 'bg-slate-200 border-slate-300' : 'bg-slate-900 border-purple-500/10'
              }`}>
                <div 
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-400 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-500 italic">
              Faltam {profile.xpNeededForNextLevel - profile.currentXp} XP para evoluir
            </p>
          </div>

          <div className="text-xs text-slate-400 space-y-2.5 px-2">
            <div className="flex justify-between">
              <span>Seguidores:</span>
              <span className="text-purple-500 font-bold">{profile.followers?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Seguindo:</span>
              <span className="text-purple-500 font-bold">{profile.following?.length || 0}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
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

      {/* 2. LADO DIREITO / CENTRO: FEED E INPUT DE POSTS */}
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 md:p-8 space-y-6 z-10">
        
        {/* Editor de Postagem */}
        <div className={`border rounded-2xl p-5 shadow-lg backdrop-blur-sm transition-all duration-300 ${
          isLightMode 
            ? "bg-white/80 border-slate-200" 
            : "bg-slate-900/80 border-purple-500/10"
        }`}>
          <h3 className={`font-serif font-bold text-lg mb-3 flex items-center gap-2 ${isLightMode ? 'text-slate-800' : 'text-amber-400'}`}>
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
              <span className={`font-semibold ${postContent.length > 250 ? 'text-amber-500' : 'text-slate-500'}`}>
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

        {/* Linha do Tempo / Feed */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2 border-purple-950/40">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Sussurros do Éter
            </h3>
            {lastRefreshed && (
              <span className="text-[10px] text-slate-500">
                Última sintonização: {lastRefreshed.toLocaleTimeString("pt-BR")}
              </span>
            )}
          </div>

          {posts.length === 0 ? (
            <div className={`text-center py-12 border border-dashed rounded-2xl italic text-sm ${
              isLightMode ? 'border-slate-300 text-slate-400' : 'border-purple-500/10 text-slate-500'
            }`}>
              Nenhuma crônica foi registrada ainda. Compartilhe seu primeiro sussurro!
            </div>
          ) : (
            posts.map((post) => {
              const isUpvoted = post.upvotes?.includes(user?.uid);
              const upvoteCount = post.upvotes?.length || 0;

              return (
                <div 
                  key={post.id} 
                  className={`border rounded-2xl p-5 transition-all duration-300 shadow-sm ${
                    isLightMode 
                      ? "bg-white border-slate-100 hover:border-purple-400" 
                      : "bg-slate-900/40 border-slate-900 hover:border-purple-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar do Autor */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-950 border border-amber-500 flex-shrink-0">
                      {post.authorPhoto ? (
                        <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl flex items-center justify-center h-full">📜</span>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm transition-all hover:text-purple-500 cursor-pointer ${
                              isLightMode ? 'text-slate-800' : 'text-slate-200'
                            }`}>
                              {post.authorName}
                            </span>
                            <span className="text-[9px] bg-purple-950/80 border border-purple-500/30 px-2 py-0.5 rounded text-purple-300 font-semibold uppercase tracking-wider">
                              {post.authorTitle}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500 font-medium">
                            {post.createdAt ? new Date(post.createdAt).toLocaleString("pt-BR") : "Sincronizando..."}
                          </span>
                        </div>
                      </div>

                      <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isLightMode ? 'text-slate-700' : 'text-slate-300'
                      }`}>
                        {post.content}
                      </p>

                      <div className="flex items-center pt-2 border-t border-purple-950/10">
                        <button
                          onClick={() => handleUpvote(post.id, post.authorId, post.upvotes)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isUpvoted 
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' 
                              : 'bg-slate-950/50 hover:bg-slate-950 text-slate-500 hover:text-amber-500 border border-slate-900 hover:border-amber-500/20'
                          }`}
                        >
                          <span className="text-sm">🔥</span>
                          <span>{upvoteCount} {isUpvoted ? "Reconhecido" : "Reconhecer"}</span>
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
    </div>
  );
}
