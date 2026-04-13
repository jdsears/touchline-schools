// FormationPitch.jsx - Visual formation display component
import { motion } from 'framer-motion'

// Default positions for common formations
const formationPositions = {
  '4-3-3': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'CM1', label: 'CM', x: 30, y: 50 },
    { id: 'CM2', label: 'CM', x: 50, y: 45 },
    { id: 'CM3', label: 'CM', x: 70, y: 50 },
    { id: 'LW', label: 'LW', x: 20, y: 22 },
    { id: 'ST', label: 'ST', x: 50, y: 12 },
    { id: 'RW', label: 'RW', x: 80, y: 22 },
  ],
  '4-4-2': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'LM', label: 'LM', x: 15, y: 45 },
    { id: 'CM1', label: 'CM', x: 35, y: 50 },
    { id: 'CM2', label: 'CM', x: 65, y: 50 },
    { id: 'RM', label: 'RM', x: 85, y: 45 },
    { id: 'ST1', label: 'ST', x: 35, y: 15 },
    { id: 'ST2', label: 'ST', x: 65, y: 15 },
  ],
  '4-2-3-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'CDM1', label: 'CDM', x: 35, y: 55 },
    { id: 'CDM2', label: 'CDM', x: 65, y: 55 },
    { id: 'LAM', label: 'LW', x: 20, y: 35 },
    { id: 'CAM', label: 'CAM', x: 50, y: 32 },
    { id: 'RAM', label: 'RW', x: 80, y: 35 },
    { id: 'ST', label: 'ST', x: 50, y: 12 },
  ],
  '3-5-2': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'CB1', label: 'CB', x: 25, y: 75 },
    { id: 'CB2', label: 'CB', x: 50, y: 78 },
    { id: 'CB3', label: 'CB', x: 75, y: 75 },
    { id: 'LWB', label: 'LWB', x: 12, y: 50 },
    { id: 'CM1', label: 'CM', x: 30, y: 52 },
    { id: 'CM2', label: 'CM', x: 50, y: 48 },
    { id: 'CM3', label: 'CM', x: 70, y: 52 },
    { id: 'RWB', label: 'RWB', x: 88, y: 50 },
    { id: 'ST1', label: 'ST', x: 35, y: 15 },
    { id: 'ST2', label: 'ST', x: 65, y: 15 },
  ],
  '3-4-3': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'CB1', label: 'CB', x: 25, y: 75 },
    { id: 'CB2', label: 'CB', x: 50, y: 78 },
    { id: 'CB3', label: 'CB', x: 75, y: 75 },
    { id: 'LM', label: 'LM', x: 15, y: 50 },
    { id: 'CM1', label: 'CM', x: 35, y: 52 },
    { id: 'CM2', label: 'CM', x: 65, y: 52 },
    { id: 'RM', label: 'RM', x: 85, y: 50 },
    { id: 'LW', label: 'LW', x: 20, y: 20 },
    { id: 'ST', label: 'ST', x: 50, y: 12 },
    { id: 'RW', label: 'RW', x: 80, y: 20 },
  ],
  '4-1-4-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'CDM', label: 'CDM', x: 50, y: 58 },
    { id: 'LM', label: 'LM', x: 15, y: 40 },
    { id: 'CM1', label: 'CM', x: 35, y: 42 },
    { id: 'CM2', label: 'CM', x: 65, y: 42 },
    { id: 'RM', label: 'RM', x: 85, y: 40 },
    { id: 'ST', label: 'ST', x: 50, y: 12 },
  ],
  '4-5-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'LM', label: 'LM', x: 15, y: 45 },
    { id: 'CM1', label: 'CM', x: 30, y: 50 },
    { id: 'CM2', label: 'CM', x: 50, y: 45 },
    { id: 'CM3', label: 'CM', x: 70, y: 50 },
    { id: 'RM', label: 'RM', x: 85, y: 45 },
    { id: 'ST', label: 'ST', x: 50, y: 12 },
  ],
  '5-3-2': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LWB', label: 'LWB', x: 12, y: 65 },
    { id: 'CB1', label: 'CB', x: 28, y: 75 },
    { id: 'CB2', label: 'CB', x: 50, y: 78 },
    { id: 'CB3', label: 'CB', x: 72, y: 75 },
    { id: 'RWB', label: 'RWB', x: 88, y: 65 },
    { id: 'CM1', label: 'CM', x: 30, y: 48 },
    { id: 'CM2', label: 'CM', x: 50, y: 45 },
    { id: 'CM3', label: 'CM', x: 70, y: 48 },
    { id: 'ST1', label: 'ST', x: 35, y: 15 },
    { id: 'ST2', label: 'ST', x: 65, y: 15 },
  ],
  '5-4-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LWB', label: 'LWB', x: 12, y: 65 },
    { id: 'CB1', label: 'CB', x: 28, y: 75 },
    { id: 'CB2', label: 'CB', x: 50, y: 78 },
    { id: 'CB3', label: 'CB', x: 72, y: 75 },
    { id: 'RWB', label: 'RWB', x: 88, y: 65 },
    { id: 'LM', label: 'LM', x: 15, y: 42 },
    { id: 'CM1', label: 'CM', x: 35, y: 45 },
    { id: 'CM2', label: 'CM', x: 65, y: 45 },
    { id: 'RM', label: 'RM', x: 85, y: 42 },
    { id: 'ST', label: 'ST', x: 50, y: 12 },
  ],
  '4-4-2 Diamond': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'CDM', label: 'CDM', x: 50, y: 58 },
    { id: 'LCM', label: 'CM', x: 30, y: 45 },
    { id: 'RCM', label: 'CM', x: 70, y: 45 },
    { id: 'CAM', label: 'CAM', x: 50, y: 32 },
    { id: 'ST1', label: 'ST', x: 35, y: 12 },
    { id: 'ST2', label: 'ST', x: 65, y: 12 },
  ],
  '4-3-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'CM1', label: 'CM', x: 30, y: 52 },
    { id: 'CM2', label: 'CM', x: 50, y: 48 },
    { id: 'CM3', label: 'CM', x: 70, y: 52 },
    { id: 'LAM', label: 'SS', x: 35, y: 28 },
    { id: 'RAM', label: 'SS', x: 65, y: 28 },
    { id: 'ST', label: 'ST', x: 50, y: 12 },
  ],
  '3-4-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'CB1', label: 'CB', x: 25, y: 75 },
    { id: 'CB2', label: 'CB', x: 50, y: 78 },
    { id: 'CB3', label: 'CB', x: 75, y: 75 },
    { id: 'LM', label: 'LM', x: 15, y: 50 },
    { id: 'CM1', label: 'CM', x: 35, y: 52 },
    { id: 'CM2', label: 'CM', x: 65, y: 52 },
    { id: 'RM', label: 'RM', x: 85, y: 50 },
    { id: 'LAM', label: 'SS', x: 35, y: 28 },
    { id: 'RAM', label: 'SS', x: 65, y: 28 },
    { id: 'ST', label: 'ST', x: 50, y: 12 },
  ],
  '4-1-2-1-2': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'CDM', label: 'CDM', x: 50, y: 58 },
    { id: 'LCM', label: 'CM', x: 30, y: 45 },
    { id: 'RCM', label: 'CM', x: 70, y: 45 },
    { id: 'CAM', label: 'CAM', x: 50, y: 32 },
    { id: 'ST1', label: 'ST', x: 35, y: 12 },
    { id: 'ST2', label: 'ST', x: 65, y: 12 },
  ],
  '3-3-4': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'CB1', label: 'CB', x: 25, y: 75 },
    { id: 'CB2', label: 'CB', x: 50, y: 78 },
    { id: 'CB3', label: 'CB', x: 75, y: 75 },
    { id: 'CM1', label: 'CM', x: 25, y: 50 },
    { id: 'CM2', label: 'CM', x: 50, y: 48 },
    { id: 'CM3', label: 'CM', x: 75, y: 50 },
    { id: 'LW', label: 'LW', x: 15, y: 22 },
    { id: 'ST1', label: 'ST', x: 38, y: 15 },
    { id: 'ST2', label: 'ST', x: 62, y: 15 },
    { id: 'RW', label: 'RW', x: 85, y: 22 },
  ],
  '2-3-5': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'CM1', label: 'CM', x: 25, y: 52 },
    { id: 'CM2', label: 'CM', x: 50, y: 48 },
    { id: 'CM3', label: 'CM', x: 75, y: 52 },
    { id: 'LW', label: 'LW', x: 12, y: 22 },
    { id: 'IF1', label: 'IF', x: 32, y: 18 },
    { id: 'ST', label: 'ST', x: 50, y: 12 },
    { id: 'IF2', label: 'IF', x: 68, y: 18 },
    { id: 'RW', label: 'RW', x: 88, y: 22 },
  ],
}

// 9-a-side formations (8 outfield + GK = 9 players)
const formationPositions9 = {
  '3-3-2': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 20, y: 72 },
    { id: 'CB', label: 'CB', x: 50, y: 75 },
    { id: 'RB', label: 'RB', x: 80, y: 72 },
    { id: 'LM', label: 'LM', x: 20, y: 48 },
    { id: 'CM', label: 'CM', x: 50, y: 45 },
    { id: 'RM', label: 'RM', x: 80, y: 48 },
    { id: 'ST1', label: 'ST', x: 35, y: 18 },
    { id: 'ST2', label: 'ST', x: 65, y: 18 },
  ],
  '3-2-3': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 20, y: 72 },
    { id: 'CB', label: 'CB', x: 50, y: 75 },
    { id: 'RB', label: 'RB', x: 80, y: 72 },
    { id: 'CM1', label: 'CM', x: 35, y: 50 },
    { id: 'CM2', label: 'CM', x: 65, y: 50 },
    { id: 'LW', label: 'LW', x: 20, y: 22 },
    { id: 'ST', label: 'ST', x: 50, y: 15 },
    { id: 'RW', label: 'RW', x: 80, y: 22 },
  ],
  '2-4-2': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'LM', label: 'LM', x: 15, y: 48 },
    { id: 'CM1', label: 'CM', x: 38, y: 52 },
    { id: 'CM2', label: 'CM', x: 62, y: 52 },
    { id: 'RM', label: 'RM', x: 85, y: 48 },
    { id: 'ST1', label: 'ST', x: 35, y: 18 },
    { id: 'ST2', label: 'ST', x: 65, y: 18 },
  ],
  '3-1-3-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 20, y: 72 },
    { id: 'CB', label: 'CB', x: 50, y: 75 },
    { id: 'RB', label: 'RB', x: 80, y: 72 },
    { id: 'CDM', label: 'CDM', x: 50, y: 58 },
    { id: 'LM', label: 'LM', x: 20, y: 38 },
    { id: 'CAM', label: 'CAM', x: 50, y: 35 },
    { id: 'RM', label: 'RM', x: 80, y: 38 },
    { id: 'ST', label: 'ST', x: 50, y: 15 },
  ],
  '2-3-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'LM', label: 'LM', x: 20, y: 52 },
    { id: 'CM', label: 'CM', x: 50, y: 55 },
    { id: 'RM', label: 'RM', x: 80, y: 52 },
    { id: 'LAM', label: 'AM', x: 35, y: 32 },
    { id: 'RAM', label: 'AM', x: 65, y: 32 },
    { id: 'ST', label: 'ST', x: 50, y: 15 },
  ],
  '2-3-3': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'CB1', label: 'CB', x: 35, y: 75 },
    { id: 'CB2', label: 'CB', x: 65, y: 75 },
    { id: 'LM', label: 'LM', x: 20, y: 50 },
    { id: 'CM', label: 'CM', x: 50, y: 48 },
    { id: 'RM', label: 'RM', x: 80, y: 50 },
    { id: 'LW', label: 'LW', x: 20, y: 22 },
    { id: 'ST', label: 'ST', x: 50, y: 15 },
    { id: 'RW', label: 'RW', x: 80, y: 22 },
  ],
}

// 7-a-side formations (6 outfield + GK = 7 players)
const formationPositions7 = {
  '2-3-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 25, y: 72 },
    { id: 'RB', label: 'RB', x: 75, y: 72 },
    { id: 'LM', label: 'LM', x: 20, y: 45 },
    { id: 'CM', label: 'CM', x: 50, y: 48 },
    { id: 'RM', label: 'RM', x: 80, y: 45 },
    { id: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '3-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 22, y: 72 },
    { id: 'CB', label: 'CB', x: 50, y: 75 },
    { id: 'RB', label: 'RB', x: 78, y: 72 },
    { id: 'CM1', label: 'CM', x: 35, y: 45 },
    { id: 'CM2', label: 'CM', x: 65, y: 45 },
    { id: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '2-1-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 25, y: 72 },
    { id: 'RB', label: 'RB', x: 75, y: 72 },
    { id: 'CDM', label: 'CDM', x: 50, y: 55 },
    { id: 'LM', label: 'LM', x: 25, y: 35 },
    { id: 'RM', label: 'RM', x: 75, y: 35 },
    { id: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '1-2-1-2': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'CB', label: 'CB', x: 50, y: 75 },
    { id: 'LM', label: 'LM', x: 22, y: 52 },
    { id: 'RM', label: 'RM', x: 78, y: 52 },
    { id: 'CAM', label: 'CAM', x: 50, y: 35 },
    { id: 'ST1', label: 'ST', x: 35, y: 18 },
    { id: 'ST2', label: 'ST', x: 65, y: 18 },
  ],
  '3-1-2': [
    { id: 'GK', label: 'GK', x: 50, y: 90 },
    { id: 'LB', label: 'LB', x: 22, y: 72 },
    { id: 'CB', label: 'CB', x: 50, y: 75 },
    { id: 'RB', label: 'RB', x: 78, y: 72 },
    { id: 'CM', label: 'CM', x: 50, y: 45 },
    { id: 'ST1', label: 'ST', x: 35, y: 18 },
    { id: 'ST2', label: 'ST', x: 65, y: 18 },
  ],
}

// 5-a-side formations (4 outfield + GK = 5 players)
const formationPositions5 = {
  '2-1-1': [
    { id: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'LB', label: 'LB', x: 25, y: 65 },
    { id: 'RB', label: 'RB', x: 75, y: 65 },
    { id: 'CM', label: 'CM', x: 50, y: 42 },
    { id: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '1-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'CB', label: 'CB', x: 50, y: 68 },
    { id: 'LM', label: 'LM', x: 25, y: 42 },
    { id: 'RM', label: 'RM', x: 75, y: 42 },
    { id: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '2-2': [
    { id: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'LB', label: 'LB', x: 28, y: 65 },
    { id: 'RB', label: 'RB', x: 72, y: 65 },
    { id: 'ST1', label: 'ST', x: 28, y: 28 },
    { id: 'ST2', label: 'ST', x: 72, y: 28 },
  ],
  '1-1-2': [
    { id: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'CB', label: 'CB', x: 50, y: 68 },
    { id: 'CM', label: 'CM', x: 50, y: 45 },
    { id: 'ST1', label: 'ST', x: 30, y: 22 },
    { id: 'ST2', label: 'ST', x: 70, y: 22 },
  ],
  '3-1': [
    { id: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'LB', label: 'LB', x: 22, y: 62 },
    { id: 'CB', label: 'CB', x: 50, y: 68 },
    { id: 'RB', label: 'RB', x: 78, y: 62 },
    { id: 'ST', label: 'ST', x: 50, y: 22 },
  ],
}

// Map of all formation sets by format
export const formationsByFormat = {
  11: formationPositions,
  9: formationPositions9,
  7: formationPositions7,
  5: formationPositions5,
}

export const defaultFormationByFormat = {
  11: '4-3-3',
  9: '3-3-2',
  7: '2-3-1',
  5: '2-1-1',
}

export default function FormationPitch({
  formation,
  secondaryFormation,
  size = 'medium', // 'small', 'medium', 'large'
  showLabels = true,
  className = '',
  customFormations = [], // Team's custom formations from Tactics
  teamFormat = 11, // 11, 9, 7, or 5 a-side
  teamFormation = null, // The team's current active formation name from tactics board
  teamPositions = null, // The team's saved positions array from tactics board
}) {
  // Select the appropriate formation set based on team format
  const defaultFormations = formationsByFormat[teamFormat] || formationPositions
  const defaultFallback = defaultFormationByFormat[teamFormat] || '4-3-3'

  // Use team's actual tactics board positions if this formation matches the team's active formation
  let positions
  if (teamPositions && Array.isArray(teamPositions) && teamPositions.length > 0 && formation === teamFormation) {
    positions = teamPositions
  } else {
    // Check custom formations, then fall back to standard formations
    const customFormation = customFormations.find(cf => cf.name === formation)
    positions = customFormation?.positions || defaultFormations[formation] || defaultFormations[defaultFallback]
  }

  const sizeClasses = {
    small: 'h-48',
    medium: 'h-64',
    large: 'h-80'
  }

  const dotSizes = {
    small: 'w-6 h-6 text-[8px]',
    medium: 'w-8 h-8 text-[10px]',
    large: 'w-10 h-10 text-xs'
  }

  return (
    <div className={`${className}`}>
      <div
        className={`${sizeClasses[size]} aspect-[3/4] relative rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10`}
        style={{
          background: `
            linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%),
            linear-gradient(to bottom,
              #15803d 0%,
              #16a34a 15%,
              #22c55e 30%,
              #16a34a 45%,
              #22c55e 55%,
              #16a34a 70%,
              #22c55e 85%,
              #15803d 100%
            )
          `
        }}
      >
        {/* Grass stripes */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                rgba(255,255,255,0.03) 0px,
                rgba(255,255,255,0.03) 16px,
                transparent 16px,
                transparent 32px
              )
            `,
            backgroundSize: '100% 32px'
          }}
        />

        {/* Pitch markings */}
        <div className="absolute inset-[5%] border-2 border-white/50 rounded-sm pointer-events-none">
          {/* Center circle */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${teamFormat <= 7 ? 'w-[14%]' : teamFormat === 9 ? 'w-[18%]' : 'w-[22%]'} aspect-square border-2 border-white/50 rounded-full`} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/60 rounded-full" />
          {/* Center line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/50 -translate-y-1/2" />

          {teamFormat === 5 ? (
            <>
              {/* 5-a-side: Small penalty arcs, no goal area boxes */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[28%] h-[10%] border-2 border-t-0 border-white/50 rounded-b-full" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28%] h-[10%] border-2 border-b-0 border-white/50 rounded-t-full" />
            </>
          ) : teamFormat === 7 ? (
            <>
              {/* 7-a-side: Smaller penalty arcs */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-[11%] border-2 border-t-0 border-white/50 rounded-b-full" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[30%] h-[11%] border-2 border-b-0 border-white/50 rounded-t-full" />
              {/* Penalty spots */}
              <div className="absolute top-[7%] left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
              <div className="absolute bottom-[7%] left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
            </>
          ) : teamFormat === 9 ? (
            <>
              {/* 9-a-side: Smaller penalty D-arcs */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[32%] h-[12%] border-2 border-t-0 border-white/50 rounded-b-full" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32%] h-[12%] border-2 border-b-0 border-white/50 rounded-t-full" />
              {/* Penalty spots */}
              <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
              <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
            </>
          ) : (
            <>
              {/* 11-a-side: Full penalty areas */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-2 border-t-0 border-white/50" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-2 border-b-0 border-white/50" />
              {/* Goal areas */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-2 border-t-0 border-white/50" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-2 border-b-0 border-white/50" />
              {/* Penalty spots */}
              <div className="absolute top-[11%] left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
              <div className="absolute bottom-[11%] left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
            </>
          )}
        </div>

        {/* Player positions */}
        {positions.map((pos, index) => (
          <motion.div
            key={pos.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.03 * index,
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
            className="absolute flex flex-col items-center"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div
              className={`
                ${dotSizes[size]} rounded-full
                flex items-center justify-center font-bold
                bg-white text-navy-900 shadow-md
              `}
            >
              {showLabels ? pos.label : ''}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Formation label */}
      <div className="mt-2 text-center">
        <span className="text-sm font-medium text-pitch-400">{formation}</span>
        {secondaryFormation && (
          <span className="text-sm text-navy-400">
            {' '} → {secondaryFormation}
          </span>
        )}
      </div>
    </div>
  )
}
