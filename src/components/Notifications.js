"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  // Escuta em tempo real as notificações do usuário logado
  useEffect(() => {
    if (!user) return;

    const notifQuery = query(
      collection(db, "notifications"),
      where("targetUserId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  // Fecha o painel ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notifId) => {
    try {
      await deleteDoc(doc(db, "notifications", notifId));
    } catch (err) {
      console.error("Erro ao remover notificação:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await Promise.all(
        notifications.map((n) => deleteDoc(doc(db, "notifications", n.id)))
      );
    } catch (err) {
      console.error("Erro ao limpar notificações:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Ícone visual baseado no tipo de notificação
  const getNotifIcon = (type) => {
    switch (type) {
      case "upvote":
        return "🔥";
      case "follow":
        return "✨";
      default:
        return "📜";
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Botão de Sino/Notificações */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-purple-500/20 hover:border-amber-400/30 transition-all"
        title="Notificações"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Painel Dropdown de Notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-slate-900 border border-purple-500/20 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-purple-500/10">
            <h3 className="text-sm font-bold text-amber-400 font-serif">
              Pergaminhos Recentes
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-slate-400 hover:text-red-400 font-bold uppercase tracking-wider transition-all"
              >
                Limpar Tudo
              </button>
            )}
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-slate-600 text-sm italic">
                Nenhum pergaminho pendente.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-all ${
                    notif.read ? "opacity-50" : ""
                  }`}
                >
                  {/* Ícone */}
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {getNotifIcon(notif.type)}
                  </span>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-slate-600 mt-1 block">
                      {notif.createdAt
                        ? new Date(notif.createdAt).toLocaleString("pt-BR")
                        : "Agora"}
                    </span>
                  </div>

                  {/* Botão Marcar como Lida / Remover */}
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="text-slate-600 hover:text-red-400 text-xs transition-all flex-shrink-0 mt-1"
                    title="Dispensar"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
