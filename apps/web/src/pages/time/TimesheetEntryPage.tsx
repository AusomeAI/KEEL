/**
 * Timesheet Entry Page
 *
 * Allows employees to submit weekly timesheets with:
 * - Daily time entry (start/end time, breaks)
 * - Real-time overtime calculation
 * - Work type classification
 * - Notes for exceptions
 *
 * Integrates with:
 * - Control Gate (submit as TIMESHEET_SUBMIT intent)
 * - Time tracking policy (validation)
 * - Leave management (auto-exclude PTO days)
 *
 * Law 2: Manual UI form for TIMESHEET_SUBMIT intent
 */

import React, { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { getApiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface DailyEntry {
  date: string; // ISO 8601
  start_time?: string; // HH:MM
  end_time?: string; // HH:MM
  break_minutes: number;
  work_type: "regular" | "special_project" | "pto_use" | "sick_use" | "personal_use";
  notes?: string;
}

interface TimesheetData {
  employee_id: string;
  week_of: string; // ISO date of Monday
  entries: DailyEntry[];
  total_hours: number; // In decimal for display
  total_overtime: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  submitted_at?: string;
  approved_by?: string;
}

export function TimesheetEntryPage() {
  const { employeeId } = useParams({ from: "/time/timesheet/$employeeId" });
  const [weekOf, setWeekOf] = useState<string>(format(startOfWeek(new Date()), "yyyy-MM-dd"));
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [activeTab, setActiveTab] = useState("entry");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const apiClient = getApiClient();

  // Load current week's timesheet
  const { data: currentTimesheet, isLoading: timesheetLoading } = useQuery({
    queryKey: ["timesheet", employeeId, weekOf],
    queryFn: async () => {
      const response = await apiClient.getTimesheet(employeeId, weekOf);
      return response as TimesheetData;
    },
  });

  // Load employee details for name display
  const { data: employee } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      return await apiClient.getEmployee(employeeId);
    },
  });

  // Load current leave balances to check PTO usage
  const { data: leaveBalances } = useQuery({
    queryKey: ["leaveBalances", employeeId],
    queryFn: async () => {
      return await apiClient.getLeaveBalances(employeeId);
    },
  });

  // Submit timesheet
  const submitMutation = useMutation({
    mutationFn: async (data: TimesheetData) => {
      return await apiClient.submitIntent({
        type: "TIMESHEET_SUBMIT",
        subject_id: employeeId,
        payload: {
          week_of: weekOf,
          entries: data.entries,
          total_hours: calculateTotalHours(data.entries),
          total_overtime: calculateOvertimeHours(data.entries),
        },
        actor_id: employeeId,
        actor_kind: "HUMAN",
        effective_from: weekOf,
      });
    },
    onSuccess: () => {
      setSuccessMessage("✅ Timesheet submitted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      setShowPreview(false);
    },
    onError: (error: any) => {
      setErrorMessage(`❌ ${error.message}`);
      setTimeout(() => setErrorMessage(""), 3000);
    },
  });

  // Initialize entries for this week (Mon-Sun)
  useEffect(() => {
    if (currentTimesheet?.entries) {
      setEntries(currentTimesheet.entries);
    } else {
      // Create empty entries for Mon-Sun
      const startDate = startOfWeek(new Date(weekOf));
      const endDate = endOfWeek(startDate);
      const daysInWeek = eachDayOfInterval({ start: startDate, end: endDate });

      setEntries(
        daysInWeek.map((date) => ({
          date: format(date, "yyyy-MM-dd"),
          start_time: undefined,
          end_time: undefined,
          break_minutes: 60,
          work_type: "regular",
          notes: "",
        }))
      );
    }
  }, [currentTimesheet, weekOf]);

  /**
   * Calculate total hours worked (excluding PTO/SICK)
   */
  function calculateTotalHours(entries: DailyEntry[]): number {
    return entries.reduce((sum, entry) => {
      if (!entry.start_time || !entry.end_time) return sum;
      if (["pto_use", "sick_use", "personal_use"].includes(entry.work_type)) return sum;

      const [startH, startM] = entry.start_time.split(":").map(Number);
      const [endH, endM] = entry.end_time.split(":").map(Number);
      const minutes = (endH * 60 + endM) - (startH * 60 + startM) - entry.break_minutes;
      return sum + minutes / 60;
    }, 0);
  }

  /**
   * Calculate overtime hours (hours over 40/week at 1.5x rate)
   */
  function calculateOvertimeHours(entries: DailyEntry[]): number {
    const totalHours = calculateTotalHours(entries);
    return Math.max(0, totalHours - 40) * 1.5; // Overtime at 1.5x rate
  }

  /**
   * Update a specific day's entry
   */
  function updateEntry(date: string, field: keyof DailyEntry, value: any) {
    setEntries(
      entries.map((entry) =>
        entry.date === date ? { ...entry, [field]: value } : entry
      )
    );
  }

  /**
   * Validate all entries before submission
   */
  function validateEntries(): boolean {
    for (const entry of entries) {
      if (entry.start_time && entry.end_time) {
        const [startH, startM] = entry.start_time.split(":").map(Number);
        const [endH, endM] = entry.end_time.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (endMinutes <= startMinutes) {
          setErrorMessage("❌ End time must be after start time");
          return false;
        }

        const duration = (endMinutes - startMinutes) / 60;
        if (duration > 16) {
          setErrorMessage("⚠️ Warning: More than 16 hours in a day (unusual)");
          // Allow but warn
        }
      }
    }
    return true;
  }

  // Group entries by day
  const startDate = startOfWeek(new Date(weekOf));
  const daysInWeek = eachDayOfInterval({
    start: startDate,
    end: endOfWeek(startDate),
  });

  const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Timesheet Entry
        </h1>
        {employee && (
          <p className="text-gray-600 dark:text-gray-400">
            {employee.first_name} {employee.last_name}
          </p>
        )}
      </div>

      {/* Week Selector */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">Week of</h2>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Input
              type="date"
              value={weekOf}
              onChange={(e) => setWeekOf(e.target.value)}
              className="w-40"
            />
            <span className="text-sm text-gray-500">
              {format(startOfWeek(new Date(weekOf)), "MMM d")} -{" "}
              {format(endOfWeek(startOfWeek(new Date(weekOf))), "MMM d, yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-100 rounded">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100 rounded">
          {successMessage}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entry">Time Entry</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* Time Entry Tab */}
        <TabsContent value="entry">
          <Card>
            <CardContent className="pt-6">
              {timesheetLoading ? (
                <div className="text-center py-8">Loading timesheet...</div>
              ) : (
                <div className="space-y-6">
                  {daysInWeek.map((date, idx) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const entry = entries.find((e) => e.date === dateStr);
                    const isWeekend = [5, 6].includes(date.getDay());

                    return (
                      <div
                        key={dateStr}
                        className={`p-4 border rounded-lg ${
                          isWeekend ? "bg-gray-50 dark:bg-gray-900" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold">
                              {dayLabels[idx]} - {format(date, "MMM d")}
                            </h3>
                            {entry?.work_type !== "regular" && (
                              <p className="text-sm text-gray-500">
                                {entry?.work_type.replace(/_/g, " ")}
                              </p>
                            )}
                          </div>
                          {entry?.start_time && entry?.end_time && (
                            <div className="text-right">
                              <p className="font-semibold">
                                {(
                                  (parseInt(entry.end_time.split(":")[0]) * 60 +
                                    parseInt(entry.end_time.split(":")[1]) -
                                    parseInt(entry.start_time.split(":")[0]) * 60 -
                                    parseInt(entry.start_time.split(":")[1]) -
                                    entry.break_minutes) /
                                  60
                                ).toFixed(2)}{" "}
                                hrs
                              </p>
                            </div>
                          )}
                        </div>

                        {entry && (
                          <div className="grid grid-cols-2 gap-4">
                            {/* Work Type */}
                            <div className="col-span-2 sm:col-span-1">
                              <label className="block text-sm font-medium mb-1">
                                Work Type
                              </label>
                              <Select
                                value={entry.work_type}
                                onValueChange={(value: any) =>
                                  updateEntry(dateStr, "work_type", value)
                                }
                              >
                                <option value="regular">Regular Work</option>
                                <option value="special_project">Special Project</option>
                                <option value="pto_use">PTO / Vacation</option>
                                <option value="sick_use">Sick Leave</option>
                                <option value="personal_use">Personal Day</option>
                              </Select>
                            </div>

                            {/* Start Time */}
                            <div className="col-span-1">
                              <label className="block text-sm font-medium mb-1">
                                Start Time
                              </label>
                              <Input
                                type="time"
                                value={entry.start_time || ""}
                                onChange={(e) => updateEntry(dateStr, "start_time", e.target.value)}
                                disabled={["pto_use", "sick_use", "personal_use"].includes(
                                  entry.work_type
                                )}
                              />
                            </div>

                            {/* End Time */}
                            <div className="col-span-1">
                              <label className="block text-sm font-medium mb-1">
                                End Time
                              </label>
                              <Input
                                type="time"
                                value={entry.end_time || ""}
                                onChange={(e) => updateEntry(dateStr, "end_time", e.target.value)}
                                disabled={["pto_use", "sick_use", "personal_use"].includes(
                                  entry.work_type
                                )}
                              />
                            </div>

                            {/* Break Duration */}
                            <div className="col-span-2 sm:col-span-1">
                              <label className="block text-sm font-medium mb-1">
                                Break Duration (min)
                              </label>
                              <Input
                                type="number"
                                value={entry.break_minutes}
                                onChange={(e) =>
                                  updateEntry(dateStr, "break_minutes", parseInt(e.target.value))
                                }
                                disabled={["pto_use", "sick_use", "personal_use"].includes(
                                  entry.work_type
                                )}
                                min="0"
                                max="120"
                              />
                            </div>

                            {/* Notes */}
                            <div className="col-span-2">
                              <label className="block text-sm font-medium mb-1">
                                Notes (optional)
                              </label>
                              <Input
                                type="text"
                                value={entry.notes || ""}
                                onChange={(e) => updateEntry(dateStr, "notes", e.target.value)}
                                placeholder="e.g., Attended training"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {calculateTotalHours(entries).toFixed(1)}
                  </p>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overtime (1.5x)</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {calculateOvertimeHours(entries).toFixed(1)}
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900 rounded col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Gross Pay Preview (at your rate)
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    (Regular hours + Overtime hours × 1.5)
                  </p>
                </div>

                <div className="col-span-2">
                  <h3 className="font-semibold mb-2">Daily Breakdown</h3>
                  <div className="space-y-2">
                    {entries.map((entry) => {
                      if (!entry.start_time || !entry.end_time) return null;
                      const hours =
                        (parseInt(entry.end_time.split(":")[0]) * 60 +
                          parseInt(entry.end_time.split(":")[1]) -
                          parseInt(entry.start_time.split(":")[0]) * 60 -
                          parseInt(entry.start_time.split(":")[1]) -
                          entry.break_minutes) /
                        60;

                      return (
                        <div key={entry.date} className="flex justify-between text-sm">
                          <span>
                            {format(new Date(entry.date), "MMM d")}: {entry.start_time}-
                            {entry.end_time}
                          </span>
                          <span className="font-medium">{hours.toFixed(1)} hrs</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setActiveTab("summary");
            setShowPreview(true);
          }}
        >
          Preview & Submit
        </Button>
      </div>

      {/* Preview Dialog */}
      {showPreview && (
        <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
          <AlertDialogContent>
            <AlertDialogTitle>Submit Timesheet?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>
                  <strong>Week of:</strong> {format(startOfWeek(new Date(weekOf)), "MMM d, yyyy")}
                </p>
                <p>
                  <strong>Total Hours:</strong> {calculateTotalHours(entries).toFixed(1)} hours
                </p>
                <p>
                  <strong>Overtime:</strong> {(calculateTotalHours(entries) > 40 ? calculateTotalHours(entries) - 40 : 0).toFixed(1)} hours at 1.5x rate
                </p>
                <p className="text-sm text-gray-600">
                  Once submitted, your timesheet will be sent for approval.
                </p>
              </div>
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (validateEntries()) {
                    submitMutation.mutate({
                      employee_id: employeeId,
                      week_of: weekOf,
                      entries,
                      total_hours: calculateTotalHours(entries),
                      total_overtime: calculateOvertimeHours(entries),
                      status: "submitted",
                    });
                  }
                }}
              >
                Submit Timesheet
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
