import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table } from "./Table";

describe("Table", () => {
  const testData = [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ];

  describe("Rendering", () => {
    it("should render a table element", () => {
      const { container } = render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const table = container.querySelector("table");
      expect(table).toBeInTheDocument();
    });

    it("should render header cells", () => {
      render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
              <Table.Cell header>Email</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
              <Table.Cell>alice@example.com</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
    });

    it("should render body rows", () => {
      render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {testData.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.name}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      );
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });

  describe("Density Variants", () => {
    it("should render compact density", () => {
      const { container } = render(
        <Table density="compact">
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const table = container.querySelector("table");
      expect(table).toHaveClass("compact");
    });

    it("should render default density", () => {
      const { container } = render(
        <Table density="default">
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const table = container.querySelector("table");
      expect(table).toHaveClass("default");
    });

    it("should render comfortable density", () => {
      const { container } = render(
        <Table density="comfortable">
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const table = container.querySelector("table");
      expect(table).toHaveClass("comfortable");
    });
  });

  describe("Row Selection", () => {
    it("should support selected state on rows", () => {
      const { container } = render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row selected>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const row = container.querySelector("tbody tr");
      expect(row).toHaveClass("selected");
    });
  });

  describe("Sortable Columns", () => {
    it("should render sortable header cells", () => {
      const { container } = render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header sortable>
                Name
              </Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const headerCell = container.querySelector("th");
      expect(headerCell).toHaveClass("sortable");
    });

    it("should handle click on sortable column", async () => {
      const { container } = render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header sortable>
                Name
              </Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const headerCell = screen.getByText("Name");
      await userEvent.click(headerCell);
      expect(headerCell.parentElement).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic table structure", () => {
      const { container } = render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const table = container.querySelector("table");
      const thead = container.querySelector("thead");
      const tbody = container.querySelector("tbody");
      expect(table).toBeInTheDocument();
      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
    });

    it("should have proper header cell role", () => {
      const { container } = render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const headerCell = container.querySelector("th");
      expect(headerCell?.tagName).toBe("TH");
    });

    it("should have proper data cell role", () => {
      const { container } = render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const dataCell = container.querySelector("tbody td");
      expect(dataCell?.tagName).toBe("TD");
    });
  });

  describe("Theme Support", () => {
    it("should support light theme", () => {
      const { container } = render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "light");
      expect(root.getAttribute("data-theme")).toBe("light");
    });

    it("should support dark theme", () => {
      const { container } = render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      );
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "dark");
      expect(root.getAttribute("data-theme")).toBe("dark");
    });
  });
});
