import type { Meta, StoryObj } from "@storybook/react";
import { Table } from "./Table";
import { useState } from "react";

/**
 * # Table Component
 *
 * Data table with sortable columns, pagination, row selection, and density toggling.
 *
 * ## Features
 * - Sortable columns
 * - Pagination controls
 * - Row selection (single and multi)
 * - Density toggle (compact/default/comfortable)
 * - Responsive mobile stacking
 * - Light/dark theme support
 * - Full keyboard accessibility
 * - WCAG 2.2 AA compliant
 *
 * ## Accessibility
 * - Semantic table element
 * - Proper thead/tbody structure
 * - aria-sort for sortable columns
 * - aria-label for pagination
 * - Keyboard navigation: Tab through cells
 */
const meta = {
  title: "Components/Table",
  component: Table,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    sortable: {
      control: "boolean",
      description: "Enable column sorting",
    },
    paginated: {
      control: "boolean",
      description: "Enable pagination",
    },
    selectable: {
      control: "boolean",
      description: "Enable row selection",
    },
    density: {
      control: "select",
      options: ["compact", "default", "comfortable"],
      description: "Row height density",
    },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", department: "HR", status: "Active" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", department: "Engineering", status: "Active" },
  { id: 3, name: "Carol Williams", email: "carol@example.com", department: "Finance", status: "Inactive" },
  { id: 4, name: "David Brown", email: "david@example.com", department: "Marketing", status: "Active" },
  { id: 5, name: "Emma Davis", email: "emma@example.com", department: "Engineering", status: "On Leave" },
];

/**
 * Basic table with employee data.
 */
export const Default: Story = {
  render: () => (
    <Table>
      <Table.Head>
        <Table.Row>
          <Table.Cell header>Name</Table.Cell>
          <Table.Cell header>Email</Table.Cell>
          <Table.Cell header>Department</Table.Cell>
          <Table.Cell header>Status</Table.Cell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {sampleData.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell>{row.email}</Table.Cell>
            <Table.Cell>{row.department}</Table.Cell>
            <Table.Cell>{row.status}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};

/**
 * Table with sortable columns.
 */
export const Sortable: Story = {
  render: () => {
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const handleSort = (column: string) => {
      if (sortBy === column) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(column);
        setSortOrder("asc");
      }
    };

    return (
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.Cell
              header
              sortable
              onClick={() => handleSort("name")}
              sorted={sortBy === "name" ? sortOrder : undefined}
            >
              Name
            </Table.Cell>
            <Table.Cell
              header
              sortable
              onClick={() => handleSort("email")}
              sorted={sortBy === "email" ? sortOrder : undefined}
            >
              Email
            </Table.Cell>
            <Table.Cell
              header
              sortable
              onClick={() => handleSort("department")}
              sorted={sortBy === "department" ? sortOrder : undefined}
            >
              Department
            </Table.Cell>
            <Table.Cell header>Status</Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {sampleData.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell>{row.name}</Table.Cell>
              <Table.Cell>{row.email}</Table.Cell>
              <Table.Cell>{row.department}</Table.Cell>
              <Table.Cell>{row.status}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  },
};

/**
 * Table with row selection.
 */
export const Selectable: Story = {
  render: () => {
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const toggleRow = (id: number) => {
      const newSelected = new Set(selected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelected(newSelected);
    };

    const toggleAll = () => {
      if (selected.size === sampleData.length) {
        setSelected(new Set());
      } else {
        setSelected(new Set(sampleData.map((r) => r.id)));
      }
    };

    return (
      <div>
        <div className="mb-4 text-sm text-neutral-600">
          {selected.size > 0 && `${selected.size} row(s) selected`}
        </div>
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header className="w-12">
                <input
                  type="checkbox"
                  checked={selected.size === sampleData.length}
                  onChange={toggleAll}
                />
              </Table.Cell>
              <Table.Cell header>Name</Table.Cell>
              <Table.Cell header>Email</Table.Cell>
              <Table.Cell header>Department</Table.Cell>
              <Table.Cell header>Status</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {sampleData.map((row) => (
              <Table.Row key={row.id} selected={selected.has(row.id)}>
                <Table.Cell className="w-12">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                  />
                </Table.Cell>
                <Table.Cell>{row.name}</Table.Cell>
                <Table.Cell>{row.email}</Table.Cell>
                <Table.Cell>{row.department}</Table.Cell>
                <Table.Cell>{row.status}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    );
  },
};

/**
 * All density variants.
 */
export const Densities: Story = {
  render: () => {
    const renderDensityTable = (density: "compact" | "default" | "comfortable") => (
      <div className="mb-8">
        <h3 className="text-sm font-semibold mb-2 text-neutral-700 capitalize">
          {density} Density
        </h3>
        <Table density={density}>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
              <Table.Cell header>Email</Table.Cell>
              <Table.Cell header>Department</Table.Cell>
              <Table.Cell header>Status</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {sampleData.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.name}</Table.Cell>
                <Table.Cell>{row.email}</Table.Cell>
                <Table.Cell>{row.department}</Table.Cell>
                <Table.Cell>{row.status}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    );

    return (
      <>
        {renderDensityTable("compact")}
        {renderDensityTable("default")}
        {renderDensityTable("comfortable")}
      </>
    );
  },
};

/**
 * Table with pagination.
 */
export const Paginated: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 3;
    const totalPages = Math.ceil(sampleData.length / pageSize);
    const startIdx = (currentPage - 1) * pageSize;
    const paginatedData = sampleData.slice(startIdx, startIdx + pageSize);

    return (
      <div>
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
              <Table.Cell header>Email</Table.Cell>
              <Table.Cell header>Department</Table.Cell>
              <Table.Cell header>Status</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {paginatedData.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.name}</Table.Cell>
                <Table.Cell>{row.email}</Table.Cell>
                <Table.Cell>{row.department}</Table.Cell>
                <Table.Cell>{row.status}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <div className="flex gap-2 mt-4 justify-end">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-neutral-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-neutral-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-neutral-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  },
};

/**
 * Table with status badges.
 */
export const WithBadges: Story = {
  render: () => (
    <Table>
      <Table.Head>
        <Table.Row>
          <Table.Cell header>Name</Table.Cell>
          <Table.Cell header>Department</Table.Cell>
          <Table.Cell header>Status</Table.Cell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {sampleData.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell>{row.department}</Table.Cell>
            <Table.Cell>
              <span
                className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                  row.status === "Active"
                    ? "bg-success-100 text-success-700"
                    : row.status === "Inactive"
                      ? "bg-neutral-100 text-neutral-700"
                      : "bg-warning-100 text-warning-700"
                }`}
              >
                {row.status}
              </span>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};

/**
 * Empty state for table with no data.
 */
export const Empty: Story = {
  render: () => (
    <Table>
      <Table.Head>
        <Table.Row>
          <Table.Cell header>Name</Table.Cell>
          <Table.Cell header>Email</Table.Cell>
          <Table.Cell header>Department</Table.Cell>
          <Table.Cell header>Status</Table.Cell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell colSpan={4} className="text-center text-neutral-500 py-8">
            No employees found
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  ),
};

/**
 * Accessibility demonstration with semantic table markup.
 */
export const Accessibility: Story = {
  render: () => (
    <Table role="table" aria-label="Employee directory">
      <Table.Head>
        <Table.Row role="row">
          <Table.Cell header role="columnheader">Name</Table.Cell>
          <Table.Cell header role="columnheader">Email</Table.Cell>
          <Table.Cell header role="columnheader">Department</Table.Cell>
          <Table.Cell header role="columnheader">Status</Table.Cell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {sampleData.map((row) => (
          <Table.Row key={row.id} role="row">
            <Table.Cell role="cell">{row.name}</Table.Cell>
            <Table.Cell role="cell">{row.email}</Table.Cell>
            <Table.Cell role="cell">{row.department}</Table.Cell>
            <Table.Cell role="cell">{row.status}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: "table-fake-header",
            enabled: true,
          },
        ],
      },
    },
  },
};
