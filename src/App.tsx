import React, { useState } from 'react';
import { UniPilotProvider, useUniPilot } from './context/useUniPilot';
import { Navbar, TabType } from './components/Navbar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { AssignmentsView } from './components/Assignments/AssignmentsView';
import { ExamsView } from './components/Exams/ExamsView';
import { ScoreCalculatorView } from './components/ScoreCalculator/ScoreCalculatorView';
import { AssignmentModal } from './components/Assignments/AssignmentModal';
import { ExamModal } from './components/Exams/ExamModal';
import { HelpModal } from './components/Help/HelpModal';
import { Assignment, Exam } from './types';

const MainApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  
  // モーダル管理
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // 逆算電卓用プリロード状態
  const [calcCourse, setCalcCourse] = useState<string | undefined>(undefined);
  const [calcExam, setCalcExam] = useState<string | undefined>(undefined);

  const {
    addAssignment,
    addAssignments,
    updateAssignment,
    addExam,
    updateExam,
  } = useUniPilot();

  // 課題編集オープン
  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setIsAssignmentModalOpen(true);
  };

  // テスト勉強編集オープン
  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setIsExamModalOpen(true);
  };

  // 逆算電卓へ遷移
  const handleOpenScoreCalculator = (courseName: string, examName: string) => {
    setCalcCourse(courseName);
    setCalcExam(examName);
    setCurrentTab('scoreCalculator');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* ナビゲーションバー */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenAssignmentModal={() => {
          setEditingAssignment(null);
          setIsAssignmentModalOpen(true);
        }}
        onOpenExamModal={() => {
          setEditingExam(null);
          setIsExamModalOpen(true);
        }}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
      />

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigateToTab={setCurrentTab}
            onOpenAssignmentModal={() => {
              setEditingAssignment(null);
              setIsAssignmentModalOpen(true);
            }}
            onOpenExamModal={() => {
              setEditingExam(null);
              setIsExamModalOpen(true);
            }}
            onEditAssignment={handleEditAssignment}
            onEditExam={handleEditExam}
          />
        )}

        {currentTab === 'assignments' && (
          <AssignmentsView
            onOpenAddModal={() => {
              setEditingAssignment(null);
              setIsAssignmentModalOpen(true);
            }}
            onEditAssignment={handleEditAssignment}
          />
        )}

        {currentTab === 'exams' && (
          <ExamsView
            onOpenAddModal={() => {
              setEditingExam(null);
              setIsExamModalOpen(true);
            }}
            onEditExam={handleEditExam}
            onOpenScoreCalculator={handleOpenScoreCalculator}
          />
        )}

        {currentTab === 'scoreCalculator' && (
          <ScoreCalculatorView
            initialCourse={calcCourse}
            initialExam={calcExam}
          />
        )}
      </main>

      {/* 提出課題 モーダル */}
      <AssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => {
          setIsAssignmentModalOpen(false);
          setEditingAssignment(null);
        }}
        initialAssignment={editingAssignment}
        onSaveMultiple={addAssignments}
        onSave={(data) => {
          if (editingAssignment) {
            updateAssignment(editingAssignment.id, data);
          } else {
            addAssignment(data);
          }
        }}
      />

      {/* テスト勉強 モーダル */}
      <ExamModal
        isOpen={isExamModalOpen}
        onClose={() => {
          setIsExamModalOpen(false);
          setEditingExam(null);
        }}
        initialExam={editingExam}
        onSave={(data) => {
          if (editingExam) {
            updateExam(editingExam.id, data);
          } else {
            addExam(data);
          }
        }}
      />

      {/* 使い方 モーダル */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <UniPilotProvider>
      <MainApp />
    </UniPilotProvider>
  );
};

export default App;
