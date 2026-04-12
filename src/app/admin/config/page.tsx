'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';

import { configService } from '@/src/services/config.service';

export default function AdminConfigPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [savingMeal, setSavingMeal] = useState(false);
  const [savingBooks, setSavingBooks] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);

  const handleSaveMealDates = async () => {
    setSavingMeal(true);
    try {
      await configService.updateMealNeedEditDates({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      toast.success('Meal need edit dates updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save meal need dates');
    } finally {
      setSavingMeal(false);
    }
  };

  const handleSaveBooksDates = async () => {
    setSavingBooks(true);
    try {
      await configService.updateBooksNeedEditDates({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      toast.success('Books need edit dates updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save books need dates');
    } finally {
      setSavingBooks(false);
    }
  };

  const handleSaveHealthDates = async () => {
    setSavingHealth(true);
    try {
      await configService.updateHealthInsuranceNeedEditDates({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      toast.success('Health insurance need edit dates updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save health insurance need dates');
    } finally {
      setSavingHealth(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="System configuration"
        description="Manage child need edit date windows"
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Child need edit dates</h2>
        <p className="mt-1 text-sm text-slate-500">
          Set the date window during which guardians may update children&apos;s needs. Then apply to each need type individually.
        </p>
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
            <div>
              <label htmlFor="start_date" className="mb-1 block text-sm font-medium text-slate-700">
                Start date
              </label>
              <input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="mb-1 block text-sm font-medium text-slate-700">
                End date
              </label>
              <input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void handleSaveMealDates()}
              disabled={savingMeal}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingMeal ? 'Saving...' : 'Update meal need dates'}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveBooksDates()}
              disabled={savingBooks}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingBooks ? 'Saving...' : 'Update books need dates'}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveHealthDates()}
              disabled={savingHealth}
              className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {savingHealth ? 'Saving...' : 'Update health insurance dates'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
