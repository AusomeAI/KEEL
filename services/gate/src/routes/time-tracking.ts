/**
 * Time Tracking Routes — Control Gate Integration
 *
 * Endpoints:
 * - POST   /api/gate/timesheet/submit
 * - GET    /api/gate/timesheet/:employeeId
 * - GET    /api/gate/timesheet/:employeeId/overtime
 * - GET    /api/gate/attendance/:employeeId
 *
 * All endpoints enforce:
 * - Authentication (OAuth 2.1 token)
 * - Authorization (tenancy scope)
 * - RLS (tenant isolation at DB kernel, Law 5)
 * - Validation (policy compliance)
 *
 * Law 2: Manual UI form TIMESHEET_SUBMIT intent registered here
 * Law 5: RLS policies on timesheet_entries table
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { TransactionIntent, DecisionRecord, Duration } from "@keel/core";
import { validateOAuthToken } from "../auth/token-validator";
import { encodeRLS } from "../middleware/rls";

/**
 * Register time tracking routes
 */
export async function registerTimeTrackingRoutes(app: FastifyInstance) {
  /**
   * POST /api/gate/timesheet/submit
   *
   * Submit weekly timesheet for approval
   * Integrates with Control Gate 9-step pipeline
   *
   * Request body:
   * {
   *   week_of: "2026-08-25",
   *   entries: [
   *     { date: "2026-08-25", start_time: "09:00", end_time: "17:00", break_minutes: 60 },
   *     ...
   *   ],
   *   total_hours: 40.0,
   *   total_overtime: 0.0
   * }
   */
  app.post("/api/gate/timesheet/submit", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Step 1: Authenticate actor (OAuth token)
      const token = request.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return reply.code(401).send({ error: "Unauthorized: missing token" });
      }

      const { actor_id, actor_kind, scopes } = await validateOAuthToken(token);
      const tenantId = scopes.tenant_id;
      const employeeId = request.body?.subject_id || actor_id;

      // Step 2: Authorize tenancy scope
      // RLS policy: user can only submit for themselves or if HR admin
      const isHrAdmin = scopes.roles?.includes("HR_ADMIN");
      if (!isHrAdmin && actor_id !== employeeId) {
        return reply.code(403).send({ error: "Forbidden: cannot submit for other employee" });
      }

      // Step 3: Check autonomy ceiling
      // TIMESHEET_SUBMIT has no autonomy requirement (L3 is sufficient)
      // Agents can submit timesheets (though unusual)

      // Step 4: Validate against policy
      const timeTrackingPolicy = await loadTimeTrackingPolicy(tenantId);
      const validationResult = await timeTrackingPolicy.validateTimesheet(request.body);

      if (!validationResult.valid) {
        return reply.code(400).send({
          error: "Timesheet validation failed",
          details: validationResult.errors,
        });
      }

      // Step 5: Simulate effect (check for conflicts with leave)
      const leaveConflicts = await checkLeaveConflicts(employeeId, request.body.entries);
      const simulationResult = {
        total_hours: request.body.total_hours,
        total_overtime: request.body.total_overtime,
        leave_conflicts: leaveConflicts,
        gross_pay_preview: simulateGrossPay(request.body.total_hours, tenantId),
      };

      // Step 6: Route for approval
      // Timesheet manager (department lead) must approve
      const approverRole = "TIMESHEET_APPROVER";

      // Step 7: Execute as ledger transaction
      const transactionId = generateId();
      const timesheetEvent = {
        event_id: generateId(),
        event_type: "TIMESHEET_SUBMITTED",
        actor_id,
        actor_kind,
        subject_id: employeeId,
        tenant_id: tenantId,
        recorded_at: new Date().toISOString(),
        valid_from: request.body.week_of,
        payload: {
          week_of: request.body.week_of,
          entries: request.body.entries,
          total_hours: request.body.total_hours,
          total_overtime: request.body.total_overtime,
          status: "pending_approval",
        },
        hash: await computeEventHash(timesheetEvent), // Will use previous_hash
      };

      await insertLedgerEvent(timesheetEvent); // Append-only, Law 3

      // Step 8: Emit Decision Record (Law 7)
      const decisionRecord = await emitDecisionRecord({
        entity_type: "timesheet",
        entity_id: employeeId,
        action: "submit",
        actor_id,
        approval_required: true,
        approver_role: approverRole,
        simulation_result: simulationResult,
        ledger_event_id: timesheetEvent.event_id,
      });

      // Step 9: Return to Control Gate result
      return reply.code(200).send({
        transaction_id: transactionId,
        status: "pending_approval",
        approval_required: true,
        approver_role: approverRole,
        simulation_result: simulationResult,
        decision_record_id: decisionRecord.id,
        message: "Timesheet submitted for approval",
      });
    } catch (error) {
      console.error("Error submitting timesheet:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  /**
   * GET /api/gate/timesheet/:employeeId
   *
   * Retrieve timesheet for employee (current or specific week)
   * Query params:
   * - weekOf: ISO date of Monday (optional, defaults to current week)
   * - include_history: boolean (optional, defaults to false)
   *
   * Response:
   * {
   *   employee_id: "emp-001",
   *   week_of: "2026-08-25",
   *   entries: [...],
   *   total_hours: 40.0,
   *   status: "pending_approval" | "approved" | "rejected" | "draft",
   *   submitted_at?: "2026-08-28T14:30:00Z",
   *   approved_by?: "mgr-001"
   * }
   *
   * RLS: User can view own timesheet or if HR admin
   */
  app.get(
    "/api/gate/timesheet/:employeeId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const token = request.headers.authorization?.replace("Bearer ", "");
        if (!token) {
          return reply.code(401).send({ error: "Unauthorized" });
        }

        const { actor_id, scopes } = await validateOAuthToken(token);
        const tenantId = scopes.tenant_id;
        const employeeId = request.params.employeeId;
        const weekOf = (request.query as any).weekOf || getMonday(new Date()).toISOString().split("T")[0];

        // RLS: Check permission
        const isHrAdmin = scopes.roles?.includes("HR_ADMIN");
        if (actor_id !== employeeId && !isHrAdmin) {
          return reply.code(403).send({ error: "Forbidden" });
        }

        // Query timesheet with RLS (law 5)
        const sql = `
          SELECT
            employee_id,
            week_of,
            entries,
            total_hours,
            status,
            submitted_at,
            approved_by
          FROM timesheet_entries
          WHERE
            tenant_id = $1
            AND employee_id = $2
            AND week_of = $3
          LIMIT 1;
        `;

        const result = await app.db.query(sql, [tenantId, employeeId, weekOf]);

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: "Timesheet not found" });
        }

        return reply.code(200).send(result.rows[0]);
      } catch (error) {
        console.error("Error fetching timesheet:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  /**
   * GET /api/gate/timesheet/:employeeId/overtime
   *
   * Retrieve overtime accrual summary
   * Query params:
   * - period: "current_week" | "current_month" | "ytd" (default: current_week)
   * - asOfDate: ISO date (optional, for historical)
   *
   * Response:
   * {
   *   employee_id: "emp-001",
   *   period: "current_week",
   *   regular_hours: 40.0,
   *   overtime_hours: 5.0,
   *   overtime_rate_multiplier: 1.5,
   *   gross_overtime_pay: 127.50 (if hourly rate known)
   * }
   */
  app.get(
    "/api/gate/timesheet/:employeeId/overtime",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const token = request.headers.authorization?.replace("Bearer ", "");
        if (!token) {
          return reply.code(401).send({ error: "Unauthorized" });
        }

        const { actor_id, scopes } = await validateOAuthToken(token);
        const tenantId = scopes.tenant_id;
        const employeeId = request.params.employeeId;
        const period = (request.query as any).period || "current_week";
        const asOfDate = (request.query as any).asOfDate || new Date().toISOString().split("T")[0];

        // RLS: Check permission
        const isHrAdmin = scopes.roles?.includes("HR_ADMIN");
        if (actor_id !== employeeId && !isHrAdmin) {
          return reply.code(403).send({ error: "Forbidden" });
        }

        // Calculate period dates
        const { startDate, endDate } = calculatePeriodDates(period, asOfDate);

        // Query timesheets in period and calculate overtime
        const sql = `
          SELECT
            week_of,
            entries,
            total_hours
          FROM timesheet_entries
          WHERE
            tenant_id = $1
            AND employee_id = $2
            AND week_of >= $3
            AND week_of <= $4
            AND status = 'approved'
          ORDER BY week_of;
        `;

        const result = await app.db.query(sql, [tenantId, employeeId, startDate, endDate]);

        // Aggregate overtime across all weeks in period
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;

        for (const row of result.rows) {
          const weekRegular = Math.min(row.total_hours, 40);
          const weekOvertime = Math.max(0, row.total_hours - 40);

          totalRegularHours += weekRegular;
          totalOvertimeHours += weekOvertime;
        }

        return reply.code(200).send({
          employee_id: employeeId,
          period,
          start_date: startDate,
          end_date: endDate,
          regular_hours: totalRegularHours,
          overtime_hours: totalOvertimeHours,
          overtime_rate_multiplier: 1.5,
          total_overtime_pay_estimate: totalOvertimeHours * 1.5 * 25, // Placeholder hourly rate
        });
      } catch (error) {
        console.error("Error fetching overtime:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  /**
   * GET /api/gate/attendance/:employeeId
   *
   * Retrieve attendance record for employee
   * Query params:
   * - month: YYYY-MM (optional, defaults to current month)
   *
   * Response: Array of attendance records with status + variance
   */
  app.get(
    "/api/gate/attendance/:employeeId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const token = request.headers.authorization?.replace("Bearer ", "");
        if (!token) {
          return reply.code(401).send({ error: "Unauthorized" });
        }

        const { actor_id, scopes } = await validateOAuthToken(token);
        const tenantId = scopes.tenant_id;
        const employeeId = request.params.employeeId;
        const month = (request.query as any).month || getCurrentMonthISO();

        // RLS: Check permission
        const isHrAdmin = scopes.roles?.includes("HR_ADMIN");
        if (actor_id !== employeeId && !isHrAdmin) {
          return reply.code(403).send({ error: "Forbidden" });
        }

        // Query attendance records for month
        const sql = `
          SELECT
            employee_id,
            date,
            status,
            hours_scheduled,
            hours_actual,
            variance_minutes,
            break_compliance
          FROM attendance_records
          WHERE
            tenant_id = $1
            AND employee_id = $2
            AND date >= $3
            AND date < $4
          ORDER BY date;
        `;

        const monthStart = `${month}-01`;
        const monthEnd = getNextMonth(monthStart);

        const result = await app.db.query(sql, [tenantId, employeeId, monthStart, monthEnd]);

        // Calculate summary metrics
        const summary = {
          present: 0,
          absent: 0,
          late: 0,
          pto: 0,
          sick: 0,
        };

        for (const row of result.rows) {
          summary[row.status]++;
        }

        return reply.code(200).send({
          employee_id: employeeId,
          month,
          records: result.rows,
          summary,
        });
      } catch (error) {
        console.error("Error fetching attendance:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );
}

/**
 * Helper functions
 */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getCurrentMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getNextMonth(monthISO: string): string {
  const [year, month] = monthISO.split("-").map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function calculatePeriodDates(
  period: string,
  asOfDate: string
): { startDate: string; endDate: string } {
  const date = new Date(asOfDate);

  switch (period) {
    case "current_week":
      const monday = getMonday(date);
      return {
        startDate: monday.toISOString().split("T")[0],
        endDate: new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      };

    case "current_month":
      return {
        startDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`,
        endDate: getNextMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`),
      };

    case "ytd":
      return {
        startDate: `${date.getFullYear()}-01-01`,
        endDate: date.toISOString().split("T")[0],
      };

    default:
      return {
        startDate: asOfDate,
        endDate: asOfDate,
      };
  }
}

async function loadTimeTrackingPolicy(tenantId: string) {
  // TODO: Load from policy store
  return {
    validateTimesheet: async (data: any) => ({
      valid: true,
      errors: [],
    }),
  };
}

async function checkLeaveConflicts(employeeId: string, entries: any[]) {
  // TODO: Query leave table for overlaps
  return [];
}

function simulateGrossPay(totalHours: number, tenantId: string): number {
  // TODO: Get employee hourly rate from salary table
  const placeholderRate = 25; // $25/hour
  const overtime = Math.max(0, totalHours - 40) * 1.5 * placeholderRate;
  const regular = Math.min(totalHours, 40) * placeholderRate;
  return regular + overtime;
}

async function computeEventHash(event: any): Promise<string> {
  // TODO: Implement SHA-256 hash with previous_hash
  return `hash-${Date.now()}`;
}

async function insertLedgerEvent(event: any): Promise<void> {
  // TODO: Insert into ledger with RLS enforcement
  console.log("Inserting ledger event:", event);
}

async function emitDecisionRecord(data: any): Promise<any> {
  // TODO: Create decision record with hash chain
  return {
    id: generateId(),
    ...data,
  };
}
