/**
 * Router Configuration
 *
 * TanStack Router v1 route definitions
 *
 * Implements Law 2: Every TransactionIntent type has a human UI route
 */

import { RootRoute, Route, Router } from "@tanstack/react-router";
import { RootApp } from "./RootApp";

// Layout
import { Layout } from "./components/Layout";

// Pages
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Intent pages (Law 2: Manual routes first)
import { HireEmployeePage } from "./pages/intents/HireEmployeePage";
import { TerminateEmployeePage } from "./pages/intents/TerminateEmployeePage";
import { ChangeJobPage } from "./pages/intents/ChangeJobPage";
import { ChangePayPage } from "./pages/intents/ChangePayPage";

// Time & Attendance pages
import { TimeTrackerPage } from "./pages/time/TimeTrackerPage";
import { TimesheetListPage } from "./pages/time/TimesheetListPage";
import { LeaveRequestPage } from "./pages/time/LeaveRequestPage";
import { LeaveApprovalsPage } from "./pages/time/LeaveApprovalsPage";

// Payroll pages
import { PayrollRunPage } from "./pages/payroll/PayrollRunPage";
import { PayrollApprovalsPage } from "./pages/payroll/PayrollApprovalsPage";
import { PayrollListPage } from "./pages/payroll/PayrollListPage";

// People pages
import { PeoplePage } from "./pages/people/PeoplePage";
import { EmployeeDetailPage } from "./pages/people/EmployeeDetailPage";

// Approvals pages
import { ApprovalsPage } from "./pages/approvals/ApprovalsPage";
import { ApprovalDetailPage } from "./pages/approvals/ApprovalDetailPage";

// Create root route
const rootRoute = new RootRoute({
  component: Layout,
});

// Auth routes
const loginRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

// Dashboard
const dashboardRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

// People management routes (implements HIRE_EMPLOYEE, TERMINATE_EMPLOYEE)
const peopleRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/people",
  component: PeoplePage,
});

const employeeDetailRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/people/$employeeId",
  component: EmployeeDetailPage,
});

const hireEmployeeRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/people/hire",
  component: HireEmployeePage,
});

const terminateEmployeeRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/people/terminate/$employeeId",
  component: TerminateEmployeePage,
});

const changeJobRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/people/change-job/$employeeId",
  component: ChangeJobPage,
});

// Compensation routes (implements CHANGE_PAY)
const changePayRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/compensation/change-pay/$employeeId",
  component: ChangePayPage,
});

// Time & Attendance routes (implements SUBMIT_TIMESHEET, REQUEST_LEAVE, APPROVE_LEAVE, CANCEL_LEAVE)
const timeRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/time",
  component: TimeTrackerPage,
});

const timesheetListRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/time/timesheets",
  component: TimesheetListPage,
});

const leaveRequestRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/time/request-leave",
  component: LeaveRequestPage,
});

const leaveApprovalsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/time/approve-leave",
  component: LeaveApprovalsPage,
});

// Payroll routes (implements RUN_PAYROLL, APPROVE_PAYROLL, POST_PAYROLL_TO_GL)
const payrollRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/payroll/run",
  component: PayrollRunPage,
});

const payrollListRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/payroll/runs",
  component: PayrollListPage,
});

const payrollApprovalsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/payroll/approve",
  component: PayrollApprovalsPage,
});

// Approvals routes (implements APPROVE_TRANSACTION, REJECT_TRANSACTION, ESCALATE_TRANSACTION)
const approvalsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/approvals",
  component: ApprovalsPage,
});

const approvalDetailRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/approvals/$approvalId",
  component: ApprovalDetailPage,
});

// 404 fallback
const notFoundRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "*",
  component: NotFoundPage,
});

// Create route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  peopleRoute,
  employeeDetailRoute,
  hireEmployeeRoute,
  terminateEmployeeRoute,
  changeJobRoute,
  changePayRoute,
  timeRoute,
  timesheetListRoute,
  leaveRequestRoute,
  leaveApprovalsRoute,
  payrollRoute,
  payrollListRoute,
  payrollApprovalsRoute,
  approvalsRoute,
  approvalDetailRoute,
  notFoundRoute,
]);

// Create router
export const router = new Router({ routeTree });

// Register router for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
