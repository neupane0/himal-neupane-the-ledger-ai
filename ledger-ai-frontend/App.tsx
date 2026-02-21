import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import Transactions from './pages/Transactions';
import ReceiptGallery from './pages/ReceiptGallery';
import Groups from './pages/Groups';
import CreateGroup from './pages/CreateGroup';
import GroupDetails from './pages/GroupDetails';
import Budgets from './pages/Budgets';
import Forecast from './pages/Forecast';
import Reminders from './pages/Reminders';
import RecurringTransactions from './pages/RecurringTransactions';
import Profile from './pages/Profile';
import CategoryAnalytics from './pages/CategoryAnalytics';
import Assistant from './pages/Assistant';
import { Login, Register } from './pages/Auth';
import { AppRoute } from './types';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path={AppRoute.LANDING} element={<Landing />} />
          <Route path={AppRoute.LOGIN} element={<Login />} />
          <Route path={AppRoute.REGISTER} element={<Register />} />

          <Route path={AppRoute.DASHBOARD} element={<Dashboard />} />
          <Route path={AppRoute.ASSISTANT} element={<Assistant />} />
          <Route path={AppRoute.TRANSACTIONS} element={<Transactions />} />
          <Route path={AppRoute.ADD_EXPENSE} element={<AddExpense />} />
          <Route path={AppRoute.RECEIPTS} element={<ReceiptGallery />} />

          <Route path={AppRoute.GROUPS} element={<Groups />} />
          <Route path={AppRoute.CREATE_GROUP} element={<CreateGroup />} />
          <Route path={AppRoute.GROUP_DETAILS} element={<GroupDetails />} />

          <Route path={AppRoute.BUDGETS} element={<Budgets />} />
          <Route path={AppRoute.FORECAST} element={<Forecast />} />
          <Route path={AppRoute.REMINDERS} element={<Reminders />} />
          <Route path={AppRoute.RECURRING} element={<RecurringTransactions />} />
          <Route path={AppRoute.PROFILE} element={<Profile />} />
          <Route path={AppRoute.CATEGORY_ANALYTICS} element={<CategoryAnalytics />} />

          <Route path="*" element={<Navigate to={AppRoute.LANDING} replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;