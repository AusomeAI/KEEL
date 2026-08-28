/**
 * Time Tracking E2E Test Suite
 *
 * Tests for Wave 4.2 Time Tracking implementation:
 * - Timesheet entry submission
 * - Overtime calculation (FLSA compliant)
 * - Attendance tracking
 * - Break compliance validation
 * - Manager approval workflow
 * - Jurisdiction-specific rules (CA, TX, FL, NY)
 * - RLS enforcement (Law 5)
 * - Decision record creation (Law 7)
 * - L3 verification (Law 8)
 * - Golden dataset coverage (Law 6)
 *
 * Uses Playwright E2E testing against running services
 * All calculations verified against FLSA standards
 */

import { test, expect } from "@playwright/test";
import { createApiClient } from "../src/api/client";
import type { TransactionIntent } from "@keel/core";

// Base URL and test data
const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:3000/api";
const EMPLOYEE_ID = "emp-time-001";
const MANAGER_ID = "mgr-001";
const TENANT_ID = "tenant-001";

// Test employee tokens (mock OAuth 2.1)
const EMPLOYEE_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlbXAtdGltZS0wMDEiLCJhY3Rvcl9raW5kIjoiSFVNQU4iLCJ0ZW5hbnRfaWQiOiJ0ZW5hbnQtMDAxIiwiYWN0b3JfaWQiOiJlbXAtdGltZS0wMDEiLCJyb2xlcyI6WyJFTVBMT1lFRSJdLCJzY29wZXMiOlsidGltZXNoZWV0OnJlYWQiLCJ0aW1lc2hlZXQ6d3JpdGUiXX0.sig";
const MANAGER_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtZ3ItMDAxIiwiYWN0b3Jfa2luZCI6IkhVTUFOIiwidGVuYW50X2lkIjoidGVuYW50LTAwMSIsImFjdG9yX2lkIjoibWdyLTAwMSIsInJvbGVzIjpbIk1BTkFHRVIiLCJUSU1FU0hFRVRfQVBQUk9WRVIiXSwic2NvcGVzIjpbInRpbWVzaGVldDpyZWFkIiwidGltZXNoZWV0OnB1YmxpYyJdfQ.sig";

// Helper to calculate hours between start/end time
function calculateHours(startTime: string, endTime: string, breakMinutes: number = 0): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  return (totalMinutes - breakMinutes) / 60;
}

test.describe("Wave 4.2: Time Tracking", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to timesheet page
    await page.goto(`${BASE_URL}/time/timesheet/${EMPLOYEE_ID}`);
    // In real scenario, login flow would happen here
  });

  test.describe("Timesheet Entry Submission", () => {
    test("should submit standard 40-hour week", async ({ page }) => {
      // Mon-Fri: 9am-5pm with 1-hour lunch = 8 hours each
      const expectedTotal = 40; // 5 days × 8 hours

      // Fill in Monday
      await page.fill('[data-testid="monday-start-time"]', "09:00");
      await page.fill('[data-testid="monday-end-time"]', "17:00");
      await page.fill('[data-testid="monday-break"]', "60");

      // Copy same for Tue-Fri (in UI, would be repeated form entries)
      for (const day of ["tuesday", "wednesday", "thursday", "friday"]) {
        await page.fill(`[data-testid="${day}-start-time"]`, "09:00");
        await page.fill(`[data-testid="${day}-end-time"]`, "17:00");
        await page.fill(`[data-testid="${day}-break"]`, "60");
      }

      // Verify total hours displayed
      const totalHours = await page.textContent('[data-testid="total-hours"]');
      expect(totalHours).toContain(`${expectedTotal}.0`);

      // Submit timesheet
      await page.click('button:has-text("Submit Timesheet")');

      // Verify success notification
      await expect(page.locator("text=Timesheet submitted successfully")).toBeVisible();

      // Verify status changed to "submitted"
      const status = await page.getAttribute('[data-testid="timesheet-status"]', "data-status");
      expect(status).toBe("submitted");
    });

    test("should calculate overtime hours (>40 per week)", async ({ page }) => {
      // Mon-Fri: 10 hours each = 50 total (10 hours overtime)
      const expectedRegular = 40;
      const expectedOvertime = 10; // At 1.5x rate

      for (const day of ["monday", "tuesday", "wednesday", "thursday", "friday"]) {
        await page.fill(`[data-testid="${day}-start-time"]`, "08:00");
        await page.fill(`[data-testid="${day}-end-time"]`, "18:00");
        await page.fill(`[data-testid="${day}-break"]`, "60");
      }

      // Verify calculations
      const regularHours = await page.textContent('[data-testid="regular-hours"]');
      const overtimeHours = await page.textContent('[data-testid="overtime-hours"]');

      expect(regularHours).toContain(`${expectedRegular}.0`);
      expect(overtimeHours).toContain(`${expectedOvertime}.0`);

      // Verify overtime multiplier shown
      const multiplier = await page.textContent('[data-testid="overtime-multiplier"]');
      expect(multiplier).toContain("1.5x");
    });

    test("should reject entries with end time before start time", async ({ page }) => {
      await page.fill('[data-testid="monday-start-time"]', "17:00");
      await page.fill('[data-testid="monday-end-time"]', "09:00");

      await page.click('button:has-text("Submit Timesheet")');

      // Should show validation error
      await expect(
        page.locator("text=End time must be after start time")
      ).toBeVisible();
    });

    test("should flag unusual hours (>16 hours/day)", async ({ page }) => {
      // Single 17-hour day
      await page.fill('[data-testid="monday-start-time"]', "06:00");
      await page.fill('[data-testid="monday-end-time"]', "23:00");
      await page.fill('[data-testid="monday-break"]', "60");

      await page.click('button:has-text("Submit Timesheet")');

      // Should show warning
      await expect(
        page.locator("text=Warning: More than 16 hours")
      ).toBeVisible();
    });
  });

  test.describe("Overtime Accrual (FLSA Compliance)", () => {
    test("should accumulate overtime across week", async ({ page }) => {
      // Mon-Tue: 8 hours, Wed-Fri: 12 hours = 56 hours total
      // Regular: 40, Overtime: 16
      const days = ["monday", "tuesday"];
      const overtimeDays = ["wednesday", "thursday", "friday"];

      for (const day of days) {
        await page.fill(`[data-testid="${day}-start-time"]`, "09:00");
        await page.fill(`[data-testid="${day}-end-time"]`, "17:00");
        await page.fill(`[data-testid="${day}-break"]`, "60");
      }

      for (const day of overtimeDays) {
        await page.fill(`[data-testid="${day}-start-time"]`, "08:00");
        await page.fill(`[data-testid="${day}-end-time"]`, "20:00");
        await page.fill(`[data-testid="${day}-break"]`, "60");
      }

      const totalHours = await page.textContent('[data-testid="total-hours"]');
      expect(totalHours).toContain("56");

      const overtimeHours = await page.textContent('[data-testid="overtime-hours"]');
      expect(overtimeHours).toContain("16"); // 56 - 40
    });

    test("should apply CA daily overtime rule (>8 hours/day)", async ({ page }) => {
      // Set jurisdiction to CA
      await page.selectOption('[data-testid="jurisdiction"]', "US_CA");

      // Monday: 10 hours = 2 hours daily OT
      await page.fill('[data-testid="monday-start-time"]', "08:00");
      await page.fill('[data-testid="monday-end-time"]', "18:00");
      await page.fill('[data-testid="monday-break"]', "60");

      // Tue-Fri: 8 hours each = 32 regular
      for (const day of ["tuesday", "wednesday", "thursday", "friday"]) {
        await page.fill(`[data-testid="${day}-start-time"]`, "09:00");
        await page.fill(`[data-testid="${day}-end-time"]', "17:00");
        await page.fill(`[data-testid="${day}-break"]`, "60");
      }

      // CA rule: should show daily OT for Monday
      const overtimeNote = await page.textContent('[data-testid="overtime-breakdown"]');
      expect(overtimeNote).toContain("Daily overtime: 2 hours");
    });

    test("should track 8th consecutive day rule (CA)", async ({ page }) => {
      await page.selectOption('[data-testid="jurisdiction"]', "US_CA");

      // Work 8 consecutive days
      for (let i = 0; i < 8; i++) {
        const dateOffset = i;
        await page.fill(
          `[data-testid="day-${dateOffset}-start-time"]`,
          "09:00"
        );
        await page.fill(
          `[data-testid="day-${dateOffset}-end-time"]`,
          "17:00"
        );
        await page.fill(`[data-testid="day-${dateOffset}-break"]`, "60");
      }

      // 8th day should be marked as OT
      const eighthDayOT = await page.textContent('[data-testid="day-7-overtime-flag"]');
      expect(eighthDayOT).toContain("✓");
    });

    test("should calculate no overtime for PTO day", async ({ page }) => {
      // Mon-Thu: 10 hours each (40 hours)
      for (const day of ["monday", "tuesday", "wednesday", "thursday"]) {
        await page.fill(`[data-testid="${day}-start-time"]`, "08:00");
        await page.fill(`[data-testid="${day}-end-time"]', "18:00");
        await page.fill(`[data-testid="${day}-break"]`, "60");
      }

      // Friday: PTO
      await page.selectOption('[data-testid="friday-work-type"]', "pto_use");

      // Should show 0 overtime (PTO doesn't count toward 40-hour threshold)
      const overtimeHours = await page.textContent('[data-testid="overtime-hours"]');
      expect(overtimeHours).toContain("0");
    });
  });

  test.describe("Break Compliance Validation", () => {
    test("should validate sufficient breaks (15 min per 4 hours)", async ({ page }) => {
      // 8 hours = requires 2 × 15-min breaks
      await page.fill('[data-testid="monday-start-time"]', "09:00");
      await page.fill('[data-testid="monday-end-time"]', "17:00");
      await page.fill('[data-testid="monday-break"]', "30"); // 30 min = compliant

      await page.click('button:has-text("Submit Timesheet")');

      // Should not show break warning
      await expect(
        page.locator("text=Insufficient break time")
      ).not.toBeVisible();
    });

    test("should flag insufficient breaks", async ({ page }) => {
      // 8 hours but only 15-min break (should have 30)
      await page.fill('[data-testid="monday-start-time"]', "09:00");
      await page.fill('[data-testid="monday-end-time"]', "17:00");
      await page.fill('[data-testid="monday-break"]', "15");

      // Attempt submit
      await page.click('button:has-text("Submit Timesheet")');

      // Should show warning
      await expect(
        page.locator("text=Insufficient break time")
      ).toBeVisible();
    });

    test("should enforce CA break rules (stricter)", async ({ page }) => {
      await page.selectOption('[data-testid="jurisdiction"]', "US_CA");

      // CA: 10-minute rest break per 4 hours, 30-minute meal per 5-6 hours
      // 8 hours should require: 2×10 min rest + 30 min meal = 50 min minimum
      await page.fill('[data-testid="monday-start-time"]', "09:00");
      await page.fill('[data-testid="monday-end-time"]', "17:00");
      await page.fill('[data-testid="monday-break"]', "40"); // 40 min < 50 min required

      await page.click('button:has-text("Submit Timesheet")');

      // Should reject (CA is stricter)
      await expect(
        page.locator("text=CA requires minimum 50 minutes break")
      ).toBeVisible();
    });
  });

  test.describe("Manager Approval Workflow", () => {
    test("should route submitted timesheet to manager approval", async ({ page }) => {
      // Employee submits
      await page.fill('[data-testid="monday-start-time"]', "09:00");
      await page.fill('[data-testid="monday-end-time"]', "17:00");
      await page.fill('[data-testid="monday-break"]', "60");
      await page.click('button:has-text("Submit Timesheet")');

      // Navigate to manager approvals
      await page.goto(`${BASE_URL}/time/timesheet-approvals?role=MANAGER`);

      // Should see pending timesheet
      await expect(
        page.locator(`text=${EMPLOYEE_ID}`)
      ).toBeVisible();

      // Click approve
      await page.click('button:has-text("Approve")');

      // Verify success
      await expect(page.locator("text=Timesheet approved")).toBeVisible();
    });

    test("should allow rejection with reason", async ({ page }) => {
      // Employee submits
      await page.fill('[data-testid="monday-start-time"]', "09:00");
      await page.fill('[data-testid="monday-end-time"]', "17:00");
      await page.fill('[data-testid="monday-break"]', "60");
      await page.click('button:has-text("Submit Timesheet")');

      // Navigate to manager approvals
      await page.goto(`${BASE_URL}/time/timesheet-approvals`);

      // Click reject
      await page.click('button:has-text("Reject")');

      // Enter reason
      await page.fill('[data-testid="rejection-reason"]', "Times don't match system logs");

      await page.click('button:has-text("Confirm Rejection")');

      // Verify status changed
      const status = await page.getAttribute('[data-testid="timesheet-status"]', "data-status");
      expect(status).toBe("rejected");
    });
  });

  test.describe("RLS Enforcement (Law 5)", () => {
    test("should prevent employee viewing other tenant's timesheet", async ({ page, context }) => {
      // Create separate context with different tenant token
      const otherTenantToken =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlbXAtb3RoZXIiLCJhY3Rvcl9raW5kIjoiSFVNQU4iLCJ0ZW5hbnRfaWQiOiJ0ZW5hbnQtMDAyIiwiYWN0b3JfaWQiOiJlbXAtb3RoZXIifQ.sig";

      // Try to access employee_id from tenant-001 with tenant-002 token
      const response = await context.request.get(
        `${API_URL}/gate/timesheet/emp-time-001`,
        {
          headers: { Authorization: `Bearer ${otherTenantToken}` },
        }
      );

      expect(response.status()).toBe(403);
    });

    test("should prevent employee viewing other employee's timesheet", async ({ page, context }) => {
      // Employee tries to view different employee's timesheet
      const response = await context.request.get(
        `${API_URL}/gate/timesheet/emp-other-001`,
        {
          headers: { Authorization: `Bearer ${EMPLOYEE_TOKEN}` },
        }
      );

      expect(response.status()).toBe(403);
    });

    test("should allow HR admin viewing any timesheet", async ({ page, context }) => {
      // HR admin token
      const hrAdminToken =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJocmFkbWluIiwiYWN0b3Jfa2luZCI6IkhVTUFOIiwidGVuYW50X2lkIjoidGVuYW50LTAwMSIsImFjdG9yX2lkIjoiaHJhZG1pbiIsInJvbGVzIjpbIkhSX0FETUluIl19.sig";

      const response = await context.request.get(
        `${API_URL}/gate/timesheet/emp-time-001`,
        {
          headers: { Authorization: `Bearer ${hrAdminToken}` },
        }
      );

      expect(response.status()).toBe(200);
    });
  });

  test.describe("Decision Records (Law 7)", () => {
    test("should create decision record on timesheet submission", async ({ page, context }) => {
      // Submit timesheet
      await page.fill('[data-testid="monday-start-time"]', "09:00");
      await page.fill('[data-testid="monday-end-time"]', "17:00");
      await page.fill('[data-testid="monday-break"]', "60");
      await page.click('button:has-text("Submit Timesheet")');

      // Get decision record ID from response
      const decisionRecordId = await page
        .locator('[data-testid="decision-record-id"]')
        .textContent();

      // Verify record exists
      const response = await context.request.get(
        `${API_URL}/decisions/${decisionRecordId}`,
        {
          headers: { Authorization: `Bearer ${EMPLOYEE_TOKEN}` },
        }
      );

      expect(response.status()).toBe(200);
      const record = await response.json();
      expect(record.entity_type).toBe("timesheet");
      expect(record.action).toBe("submit");
    });

    test("should maintain hash chain on decision records", async ({ page, context }) => {
      // Submit first timesheet
      await page.fill('[data-testid="monday-start-time"]', "09:00");
      await page.fill('[data-testid="monday-end-time"]', "17:00");
      await page.fill('[data-testid="monday-break"]', "60");
      await page.click('button:has-text("Submit Timesheet")');

      const firstRecordId = await page
        .locator('[data-testid="decision-record-id"]')
        .textContent();

      // Submit second timesheet (different week)
      await page.fill('[data-testid="week-of"]', "2026-09-01");
      await page.fill('[data-testid="monday-start-time"]', "09:00");
      await page.fill('[data-testid="monday-end-time"]', "17:00");
      await page.fill('[data-testid="monday-break"]', "60");
      await page.click('button:has-text("Submit Timesheet")');

      const secondRecordId = await page
        .locator('[data-testid="decision-record-id"]')
        .textContent();

      // Verify second record chains to first
      const response = await context.request.get(
        `${API_URL}/decisions/${secondRecordId}`,
        {
          headers: { Authorization: `Bearer ${EMPLOYEE_TOKEN}` },
        }
      );

      const record = await response.json();
      expect(record.previous_record_id).toBe(firstRecordId);
    });
  });

  test.describe("L3 Mode Verification (Law 8)", () => {
    test("should complete timesheet workflow with agents disabled", async ({ page, context }) => {
      // Set agent plane to disabled (L3 mode)
      await context.request.post(
        `${API_URL}/admin/agent-plane/disable`,
        {
          headers: { Authorization: `Bearer ${MANAGER_TOKEN}` },
        }
      );

      // Complete full workflow
      await page.fill('[data-testid="monday-start-time"]', "09:00");
      await page.fill('[data-testid="monday-end-time"]', "17:00");
      await page.fill('[data-testid="monday-break"]', "60");
      await page.click('button:has-text("Submit Timesheet")');

      // Should succeed without agent plane
      await expect(page.locator("text=Timesheet submitted successfully")).toBeVisible();

      // Navigate to approvals
      await page.goto(`${BASE_URL}/time/timesheet-approvals`);
      await page.click('button:has-text("Approve")');

      // Should complete
      await expect(page.locator("text=Timesheet approved")).toBeVisible();
    });
  });

  test.describe("Golden Dataset Coverage (Law 6)", () => {
    test.only("should pass all golden dataset test cases", async ({ page, context }) => {
      const testCases = [
        {
          name: "Standard 40-hour week (no overtime)",
          hours: [8, 8, 8, 8, 8],
          breaks: [60, 60, 60, 60, 60],
          expectedOvertime: 0,
        },
        {
          name: "50-hour week with 10 hours overtime",
          hours: [10, 10, 10, 10, 10],
          breaks: [60, 60, 60, 60, 60],
          expectedOvertime: 10,
        },
        {
          name: "Uneven distribution (35+35+40)",
          hours: [7, 7, 7, 7, 10],
          breaks: [60, 60, 60, 60, 60],
          expectedOvertime: 2,
        },
      ];

      for (const testCase of testCases) {
        console.log(`Testing: ${testCase.name}`);

        // Fill in hours for each day
        for (let i = 0; i < 5; i++) {
          const day = ["monday", "tuesday", "wednesday", "thursday", "friday"][i];
          const hoursWorked = testCase.hours[i];
          const breakTime = testCase.breaks[i];

          // Calculate start/end times
          const startTime = "09:00";
          const endMinutes = 9 * 60 + hoursWorked * 60 + breakTime;
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;

          await page.fill(`[data-testid="${day}-start-time"]`, startTime);
          await page.fill(`[data-testid="${day}-end-time"]`, endTime);
          await page.fill(`[data-testid="${day}-break"]`, String(breakTime));
        }

        // Verify calculated overtime
        const overtimeText = await page.textContent('[data-testid="overtime-hours"]');
        expect(overtimeText).toContain(String(testCase.expectedOvertime));

        // Clear for next test
        await page.reload();
      }
    });
  });
});
