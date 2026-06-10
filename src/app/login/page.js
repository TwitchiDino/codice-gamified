"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [factionChoice, setFactionChoice] = useState("Luz"); // Escolha mística inicial

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Função auxiliar para inicializar dados do usuário no Firestore se ele for novo
  const initializeUserDoc = async (userId, userDisplayName, userEmail, selectedFaction) => {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      await setDoc(userRef, {
        level: 1,
        currentXp: 0,
        xpNeededForNextLevel: 100,
        title: "Aprendiz de Escriba",
        unlockedThemes: ["default"],
        inventory: [],
        displayName: userDisplayName || "Escriba Desconhecido",
        email: userEmail,
        photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=" + userId, // Avatar místico robótico/mágico
        bannerURL: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1000", // Banner místico padrão
        faction: selectedFaction || "Luz",
        followers: [],
        following: [],
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        await initializeUserDoc(credential.user.uid, name, email, factionChoice);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está em uso por outro grimório.");
      } else if (err.code === "auth/weak-password") {
        setError("Sua assinatura (senha) deve conter ao menos 6 caracteres.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Selo rúnico inválido (e-mail ou senha incorretos).");
      } else {
        setError(err.message || "Erro na comunhão mágica.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      // O Google não passa a escolha da facção no pop-up, então definimos como "Luz" por padrão
      await initializeUserDoc(result.user.uid, result.user.displayName, result.user.email, "Luz");
      router.push("/");
    } catch (err) {
      console.error(err);
      setError(err.message || "Falha na conexão com o Google.");
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-500 font-serif">
        <div className="text-center">
          <p className="text-2xl animate-pulse">Consultando as Estrelas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-slate-950/80 to-slate-950/100 pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/85 backdrop-blur-md border border-amber-500/20 p-8 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.15)] text-slate-100">
        
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-amber-400/40 flex items-center justify-center bg-purple-950/80 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-spin-slow">
          <span className="text-amber-400 text-2xl font-serif">📜</span>
        </div>

        <h2 className="text-4xl font-extrabold text-amber-400 text-center mb-1 tracking-wider font-serif">
          CÓDICE
        </h2>
        <p className="text-center text-[10px] text-purple-400 uppercase tracking-[0.2em] mb-6">
          {isSignUp ? "Inicie sua crônica eterna" : "Decifre os selos de acesso"}
        </p>

        {error && (
          <div className="bg-red-900/40 border border-red-500/40 text-red-200 text-xs p-3 rounded-lg mb-6 shadow-inner text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1 font-bold tracking-wider">
                  Alcunha / Nome de Escriba
                </label>
                <input
                  type="text"
                  placeholder="Ex: AlquimistaRúnico"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-950/90 border border-purple-500/20 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl p-2.5 text-slate-100 outline-none transition-all duration-300 placeholder-slate-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1 font-bold tracking-wider">
                  Escolha sua Facção de Iniciação
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setFactionChoice("Luz")}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                      factionChoice === "Luz"
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    ☀️ Ordem da Luz
                  </button>
                  <button
                    type="button"
                    onClick={() => setFactionChoice("Trevas")}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                      factionChoice === "Trevas"
                        ? "bg-purple-900/30 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    🌑 Pacto das Trevas
                  </button>
                </div>
              </div>
            </>
          )}
          
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1 font-bold tracking-wider">
              E-mail do Grimório
            </label>
            <input
              type="email"
              placeholder="seu-grimorio@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950/90 border border-purple-500/20 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl p-2.5 text-slate-100 outline-none transition-all duration-300 placeholder-slate-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1.5 font-bold tracking-wider">
              Assinatura Rúnica (Senha)
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-950/90 border border-purple-500/20 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl p-2.5 text-slate-100 outline-none transition-all duration-300 placeholder-slate-600 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all duration-300 transform active:scale-[0.98] mt-4 shadow-[0_4px_20px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-serif"
          >
            {authLoading ? "Canalizando..." : isSignUp ? "Registrar Grimório" : "Decifrar Selo (Entrar)"}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-x-0 h-px bg-slate-800" />
          <span className="relative px-3 bg-slate-900 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
            ou acesse via portal
          </span>
        </div>

        {/* Botão Google Auth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={authLoading}
          className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-purple-500/20 hover:border-amber-400/50 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-xs tracking-wide text-slate-200 hover:text-white"
        >
          {/* Logo do Google simplificada */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.18 4.114-3.466 0-6.29-2.774-6.29-6.29s2.825-6.29 6.29-6.29c1.603 0 3.036.602 4.137 1.587l3.08-3.08C19.145 2.193 15.938 1 12.24 1 5.922 1 1 5.922 1 12.24s4.922 11.24 11.24 11.24c6.318 0 11.24-4.922 11.24-11.24 0-.796-.08-1.56-.226-2.285H12.24z"
            />
          </svg>
          Entrar com Google
        </button>

        <p className="mt-8 text-center text-xs text-slate-400">
          {isSignUp ? "Já possui uma crônica?" : "Novo escriba na guilda?"} &nbsp;
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-amber-400 hover:text-amber-300 hover:underline font-bold transition-all"
          >
            {isSignUp ? "Acessar Grimório" : "Escrever Primeira Página"}
          </button>
        </p>
      </div>
    </div>
  );
}
