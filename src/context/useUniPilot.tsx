import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Assignment, 
  Exam, 
  AcademicTask, 
  PrioritizedItem, 
  TimeStudyPlan,
  AssignmentProgress
} from '../types';
import { INITIAL_ASSIGNMENTS, INITIAL_EXAMS } from '../data/sampleData';
import { calculateAcademicPriorities } from '../services/priorityCalculator';
import { generateStudyPlan } from '../services/studyPlanOptimizer';

interface UniPilotContextType {
  assignments: Assignment[];
  exams: Exam[];
  allTasks: AcademicTask[];
  availableHours: number;
  setAvailableHours: (hours: number) => void;

  // 課題操作
  addAssignment: (data: Omit<Assignment, 'id' | 'itemType' | 'createdAt'>) => void;
  addAssignments: (dataList: Omit<Assignment, 'id' | 'itemType' | 'createdAt'>[]) => void;
  updateAssignment: (id: string, updated: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  deleteAssignmentSeries: (seriesId: string) => void;
  toggleAssignmentSubmitted: (id: string) => void;
  updateAssignmentProgress: (id: string, progress: AssignmentProgress) => void;

  // テスト勉強操作
  addExam: (data: Omit<Exam, 'id' | 'itemType' | 'createdAt'>) => void;
  updateExam: (id: string, updated: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
  toggleExamCompleted: (id: string) => void;
  updateExamUnderstanding: (id: string, understanding: number) => void;

  // 全データクリア / デモデータ復元
  resetToSampleData: () => void;
  clearAllData: () => void;

  // 計算エンジン結果
  prioritizedData: {
    doNowItems: PrioritizedItem[];
    deferrableItems: PrioritizedItem[];
    notNeededNowItems: PrioritizedItem[];
    needsAttentionItems: PrioritizedItem[];
    allPrioritized: PrioritizedItem[];
  };
  studyPlan: TimeStudyPlan;
}

const STORAGE_KEY_ASSIGNMENTS = 'unipilot_academic_assignments_v3';
const STORAGE_KEY_EXAMS = 'unipilot_academic_exams_v3';
const STORAGE_KEY_HOURS = 'unipilot_academic_hours_v3';

const UniPilotContext = createContext<UniPilotContextType | null>(null);

export const UniPilotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 提出課題（架空データは排除）
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load assignments', e);
    }
    return [];
  });

  // テスト勉強（架空データは排除）
  const [exams, setExams] = useState<Exam[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXAMS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load exams', e);
    }
    return [];
  });

  // 今日使える勉強時間（時間単位、デフォルト2.0時間）
  const [availableHours, setAvailableHours] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HOURS);
      if (saved) return parseFloat(saved);
    } catch (e) {
      console.error('Failed to load hours', e);
    }
    return 2.0;
  });

  // localStorage 永続化
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
    } catch (e) {
      console.error('Failed to save assignments', e);
    }
  }, [assignments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(exams));
    } catch (e) {
      console.error('Failed to save exams', e);
    }
  }, [exams]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HOURS, availableHours.toString());
    } catch (e) {
      console.error('Failed to save hours', e);
    }
  }, [availableHours]);

  // 全タスク統合
  const allTasks: AcademicTask[] = useMemo(() => {
    return [...assignments, ...exams];
  }, [assignments, exams]);

  // 優先順位計算
  const prioritizedData = useMemo(() => {
    return calculateAcademicPriorities(allTasks);
  }, [allTasks]);

  // 今日使える時間に応じた学習計画
  const studyPlan = useMemo(() => {
    const availableMinutes = Math.round(availableHours * 60);
    return generateStudyPlan(prioritizedData.allPrioritized, availableMinutes);
  }, [prioritizedData.allPrioritized, availableHours]);

  // --- 課題操作ハンドラ ---
  const addAssignment = (data: Omit<Assignment, 'id' | 'itemType' | 'createdAt'>) => {
    const newAssignment: Assignment = {
      ...data,
      id: `asg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemType: 'assignment',
      createdAt: new Date().toISOString(),
    };
    setAssignments(prev => [newAssignment, ...prev]);
  };

  const addAssignments = (dataList: Omit<Assignment, 'id' | 'itemType' | 'createdAt'>[]) => {
    const newItems: Assignment[] = dataList.map((data, index) => ({
      ...data,
      id: `asg-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
      itemType: 'assignment',
      createdAt: new Date().toISOString(),
    }));
    setAssignments(prev => [...newItems, ...prev]);
  };

  const updateAssignment = (id: string, updated: Partial<Assignment>) => {
    setAssignments(prev => prev.map(a => (a.id === id ? { ...a, ...updated } : a)));
  };

  const deleteAssignment = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const deleteAssignmentSeries = (seriesId: string) => {
    setAssignments(prev => prev.filter(a => a.weeklySeriesId !== seriesId));
  };

  const toggleAssignmentSubmitted = (id: string) => {
    setAssignments(prev =>
      prev.map(a => {
        if (a.id === id) {
          const nextProgress = a.progress === 'submitted' ? 'not_started' : 'submitted';
          return { ...a, progress: nextProgress };
        }
        return a;
      })
    );
  };

  const updateAssignmentProgress = (id: string, progress: AssignmentProgress) => {
    setAssignments(prev => prev.map(a => (a.id === id ? { ...a, progress } : a)));
  };

  // --- テスト勉強操作ハンドラ ---
  const addExam = (data: Omit<Exam, 'id' | 'itemType' | 'createdAt'>) => {
    const newExam: Exam = {
      ...data,
      id: `exam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemType: 'exam',
      createdAt: new Date().toISOString(),
    };
    setExams(prev => [newExam, ...prev]);
  };

  const updateExam = (id: string, updated: Partial<Exam>) => {
    setExams(prev => prev.map(e => (e.id === id ? { ...e, ...updated } : e)));
  };

  const deleteExam = (id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
  };

  const toggleExamCompleted = (id: string) => {
    setExams(prev =>
      prev.map(e => {
        if (e.id === id) {
          return { ...e, isCompleted: !e.isCompleted };
        }
        return e;
      })
    );
  };

  const updateExamUnderstanding = (id: string, understanding: number) => {
    setExams(prev =>
      prev.map(e => {
        if (e.id === id) {
          return { ...e, understanding: Math.max(0, Math.min(100, understanding)) };
        }
        return e;
      })
    );
  };

  const resetToSampleData = () => {
    setAssignments(INITIAL_ASSIGNMENTS);
    setExams(INITIAL_EXAMS);
    setAvailableHours(2.0);
  };

  const clearAllData = () => {
    setAssignments([]);
    setExams([]);
  };

  return (
    <UniPilotContext.Provider
      value={{
        assignments,
        exams,
        allTasks,
        availableHours,
        setAvailableHours,
        addAssignment,
        addAssignments,
        updateAssignment,
        deleteAssignment,
        deleteAssignmentSeries,
        toggleAssignmentSubmitted,
        updateAssignmentProgress,
        addExam,
        updateExam,
        deleteExam,
        toggleExamCompleted,
        updateExamUnderstanding,
        resetToSampleData,
        clearAllData,
        prioritizedData,
        studyPlan,
      }}
    >
      {children}
    </UniPilotContext.Provider>
  );
};

export const useUniPilot = () => {
  const context = useContext(UniPilotContext);
  if (!context) {
    throw new Error('useUniPilot must be used within a UniPilotProvider');
  }
  return context;
};
