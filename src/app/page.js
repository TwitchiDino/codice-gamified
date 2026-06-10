"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove 
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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setPosts(postsData);
    });

    return () => unsubscribe();
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
        content: postContent,
        createdAt: serverTimestamp(),
        upvotes: []
      });

      await addXpAndCheckLevelUp(user.uid, 15);
      setPostContent("");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row border-slate-900">
      
      <aside className="w-full md:w-80 bg-slate-900 border-b md:border-b-0 md:border-r border-amber-500/20 p-6 flex flex-col justify-between md:h-screen md:sticky md:top-0">
        <div className="space-y-6">
          
          <div className="text-center pb-6 border-b border-purple-900/30">
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600 via-purple-700 to-indigo-800 flex items-center justify-center mx-auto text-4xl font-extrabold shadow-[0_0_20px_rgba(168,85,247,0.3)] border-2 border-amber-400">
              {profile.displayName ? profile.displayName.substring(0, 2).toUpperCase() : "📜"}
            </div>
            <h2 className="mt-4 text-xl font-extrabold tracking-wide text-amber-400 font-serif">
              {profile.displayName}
            </h2>
            <p className="text-xs font-semibold tracking-widest text-purple-400 uppercase mt-1">
              ✨ {profile.title}
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-purple-500/10 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-amber-400 font-serif">Nível Místico</span>
              <span className="bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {profile.level}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                <span>Experiência</span>
                <span>{profile.currentXp} / {profile.xpNeededForNextLevel} XP</span>
              </div>

              <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden border border-purple-500/10 shadow-inner">
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
              <span>Temas Desbloqueados:</span>
              <span className="text-amber-400 font-bold">{profile.unlockedThemes?.length || 1}</span>
            </div>
            <div className="flex justify-between">
              <span>Itens no Inventário:</span>
              <span className="text-purple-400 font-bold">{profile.inventory?.length || 0}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-6 md:mt-0 w-full py-2.5 bg-slate-950 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/20 rounded-xl transition-all duration-300 text-xs font-bold font-serif"
        >
          Fechar Grimório (Sair)
        </button>
      </aside>

      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 md:p-8 space-y-6">
        
        <div className="bg-slate-900/80 border border-purple-500/10 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
          <h3 className="text-amber-400 font-serif font-bold text-lg mb-3 flex items-center gap-2">
            ✍️ Registrar Nova Crônica
          </h3>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <textarea
              maxLength={280}
              rows={3}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Escreva seus sussurros místicos ou sabedorias..."
              className="w-full bg-slate-950 border border-purple-500/20 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl p-3 text-slate-200 placeholder-slate-600 outline-none resize-none transition-all text-sm leading-relaxed"
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

        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 border-b border-purple-950/40 pb-2">
            Sussurros do Éter
          </h3>

          {posts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-purple-500/10 rounded-2xl text-slate-500 italic text-sm">
              Nenhuma crônica foi registrada ainda. Compartilhe seu primeiro sussurro!
            </div>
          ) : (
            posts.map((post) => {
              const isUpvoted = post.upvotes?.includes(user?.uid);
              const upvoteCount = post.upvotes?.length || 0;

              return (
                <div 
                  key={post.id} 
                  className="bg-slate-900/40 border border-slate-900 hover:border-purple-500/10 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(168,85,247,0.05)] space-y-3"
                >
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-sm hover:text-amber-400 cursor-pointer transition-all">
                          {post.authorName}
                        </span>
                        <span className="text-[10px] bg-purple-950/80 border border-purple-500/30 px-2 py-0.5 rounded text-purple-300 font-semibold uppercase tracking-wider scale-90">
                          {post.authorTitle}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-medium">
                        {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString("pt-BR") : "Sincronizando..."}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {post.content}
                  </p>

                  <div className="flex items-center pt-2 border-t border-purple-950/20">
                    <button
                      onClick={() => handleUpvote(post.id, post.authorId, post.upvotes)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isUpvoted 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                          : 'bg-slate-950 hover:bg-slate-900 text-slate-500 hover:text-amber-400 border border-slate-900 hover:border-amber-500/20'
                      }`}
                    >
                      <span className="text-sm">🔥</span>
                      <span>{upvoteCount} {isUpvoted ? "Reconhecido" : "Reconhecer"}</span>
                    </button>
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
