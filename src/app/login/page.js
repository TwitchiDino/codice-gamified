"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });

        await setDoc(doc(db, "users", credential.user.uid), {
          level: 1,
          currentXp: 0,
          xpNeededForNextLevel: 100,
          title: "Aprendiz de Escriba",
          unlockedThemes: ["default"],
          inventory: [],
          displayName: name,
          email: email,
          createdAt: new Date().toISOString()
        });
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
        <p className="text-center text-[10px] text-purple-400 uppercase tracking-[0.2em] mb-8">
          {isSignUp ? "Inicie sua crônica eterna" : "Decifre os selos de acesso"}
        </p>

        {error && (
          <div className="bg-red-900/40 border border-red-500/40 text-red-200 text-xs p-3 rounded-lg mb-6 shadow-inner text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1.5 font-bold tracking-wider">
                Alcunha / Nome de Escriba
              </label>
              <input
                type="text"
                placeholder="Ex: AlquimistaRúnico"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-950/90 border border-purple-500/20 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl p-3 text-slate-100 outline-none transition-all duration-300 placeholder-slate-600 text-sm"
              />
            </div>
          )}
          
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1.5 font-bold tracking-wider">
              E-mail do Grimório
            </label>
            <input
              type="email"
              placeholder="seu-grimorio@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950/90 border border-purple-500/20 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl p-3 text-slate-100 outline-none transition-all duration-300 placeholder-slate-600 text-sm"
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
              className="w-full bg-slate-950/90 border border-purple-500/20 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl p-3 text-slate-100 outline-none transition-all duration-300 placeholder-slate-600 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all duration-300 transform active:scale-[0.98] mt-8 shadow-[0_4px_20px_rgba(168,85,247,0.3)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-serif"
          >
            {authLoading ? "Canalizando..." : isSignUp ? "Registrar Grimório" : "Decifrar Selo (Entrar)"}
          </button>
        </form>

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
