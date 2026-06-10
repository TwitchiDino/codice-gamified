import { doc, runTransaction } from "firebase/firestore";
import { db } from "./config";

const TITLES = {
  1: "Aprendiz de Escriba",
  5: "Escriba Real",
  10: "Arquivista Cósmico",
  20: "Mago Rúnico",
  30: "Arquivista Divino",
  50: "Arquivista Lendário"
};

function getTitleForLevel(level) {
  const levels = Object.keys(TITLES).map(Number).sort((a, b) => b - a);
  for (const lvl of levels) {
    if (level >= lvl) return TITLES[lvl];
  }
  return "Aprendiz de Escriba";
}

function getUnlockedThemesForLevel(level) {
  const themes = ["default"];
  if (level >= 5) themes.push("parchment");
  if (level >= 10) themes.push("dark-neon");
  if (level >= 30) themes.push("codice-gold");
  return themes;
}

export async function addXpAndCheckLevelUp(userId, points) {
  if (!userId || typeof points !== "number" || points <= 0) return;

  const userRef = doc(db, "users", userId);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("Usuário não cadastrado na base de dados.");
      }

      const userData = userDoc.data();
      
      let level = userData.level || 1;
      let currentXp = (userData.currentXp || 0) + points;
      let xpNeededForNextLevel = userData.xpNeededForNextLevel || 100;
      let title = userData.title || "Aprendiz de Escriba";
      let unlockedThemes = userData.unlockedThemes || ["default"];
      let levelUpOccurred = false;

      while (currentXp >= xpNeededForNextLevel) {
        currentXp -= xpNeededForNextLevel;
        level += 1;
        xpNeededForNextLevel = level * 100; // Curva de XP: Level * 100
        title = getTitleForLevel(level);
        unlockedThemes = getUnlockedThemesForLevel(level);
        levelUpOccurred = true;
      }

      transaction.update(userRef, {
        level,
        currentXp,
        xpNeededForNextLevel,
        title,
        unlockedThemes
      });

      if (levelUpOccurred) {
        console.log(`Subiu de Nível! Nível: ${level}, Novo Título: ${title}`);
      }
    });
  } catch (error) {
    console.error("Erro na transação de XP e Level Up:", error);
    throw error;
  }
}
