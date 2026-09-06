"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FilterDepartment from "./FilterDepartment";
import FilterShortlisted from "./FilterShortlisted";
import { FaSortAmountDownAlt } from "react-icons/fa";
import { GrPowerReset } from "react-icons/gr";
import { Button } from "./ui/button";
import { CheckBoxComp } from "./CheckBoxComp";
import { toast } from "sonner";
import { curDate, curMonth, curYear, months } from "@/constants";
import { IoCloudDownloadOutline } from "react-icons/io5";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  useFilters,
  usePagination,
  useRowSelect,
} from "react-table";
import { Input } from "@/components/ui/input";
import PaginationComp from "./PaginationComp";
import DialogComp from "./DialogComp";
import { CSVLink } from "react-csv";
import { CSV_Header } from "@/constants";

export default function DataTable({ data = [] }) {
  const [tableData, setTableData] = useState(data);
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedShortlisted, setSelectedShortlisted] = useState("All");

  const filterFunc = useCallback((dept) => {
    setSelectedDept(dept || "All");
  }, []);

  const shortlistedFilterFunc = useCallback((status) => {
    setSelectedShortlisted(status || "All");
  }, []);

  // Fast, derived filtered data without O(N^2) or cascading useEffects
  const filteredData = useMemo(() => {
    return tableData.filter((item) => {
      const matchDept = selectedDept === "All" || item.Department === selectedDept;
      const isShortlistedBool = Boolean(item.shortlisted || item.Shortlisted);
      const matchShortlisted =
        selectedShortlisted === "All" || String(isShortlistedBool) === selectedShortlisted;
      return matchDept && matchShortlisted;
    });
  }, [tableData, selectedDept, selectedShortlisted]);

  const handleShortlist = useCallback(async (id, currentStatus) => {
    try {
      const res = await fetch(`/api/shortlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: !currentStatus }),
      });

      if (res.ok) {
        setTableData((prev) =>
          prev.map((applicant) =>
            applicant._id === id || applicant.id === id
              ? { ...applicant, shortlisted: !currentStatus }
              : applicant
          )
        );
        toast.success("Applicant status updated!");
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Error updating applicant status");
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        Header: "Sr No",
        accessor: (row, index) => index + 1,
      },
      {
        Header: "Name",
        accessor: "Name",
      },
      {
        Header: "Registration Number",
        accessor: "RegistrationNumber",
      },
      {
        Header: "Email",
        accessor: "Email",
      },
      {
        Header: "Department",
        accessor: "Department",
      },
      {
        Header: "Preference",
        accessor: "Pref",
      },
      {
        Header: "Shortlisted",
        accessor: "shortlisted",
        Cell: ({ row }) => {
          const isShortlisted = Boolean(row.original.shortlisted);
          const applicantId = row.original._id || row.original.id;
          return (
            <button
              onClick={() => handleShortlist(applicantId, isShortlisted)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isShortlisted
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {isShortlisted ? "Unshortlist" : "Shortlist"}
            </button>
          );
        },
      },
    ],
    [handleShortlist]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    state,
    pageOptions,
    gotoPage,
    pageCount,
    setPageSize,
    setGlobalFilter,
    selectedFlatRows,
  } = useTable(
    {
      columns,
      data: filteredData,
      initialState: { pageSize: 10 },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((cols) => [
        {
          id: "selection",
          Header: ({ getToggleAllRowsSelectedProps }) => (
            <CheckBoxComp {...getToggleAllRowsSelectedProps()} />
          ),
          Cell: ({ row }) => <CheckBoxComp {...row.getToggleRowSelectedProps()} />,
        },
        ...cols,
      ]);
    }
  );

  const { globalFilter, pageIndex } = state;

  const handlePageSize = (e) => {
    const sz = Number(e.target.value);
    setPageSize(sz > 0 ? sz : 10);
  };

  const showRowData = () => {
    return selectedFlatRows.map((row) => row.original);
  };

  const formatQuestionsForCsv = (item) => {
    if (!item?.Questions) return "";

    if (Array.isArray(item.Questions)) {
      return item.Questions.map((entry) => {
        if (typeof entry === "string") return entry;
        if (Array.isArray(entry)) return entry.join(": ");
        if (entry && typeof entry === "object") {
          return Object.entries(entry)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" | ");
        }
        return String(entry ?? "");
      }).join(" | ");
    }

    if (typeof item.Questions === "object") {
      return Object.entries(item.Questions)
        .map(([question, answer]) => `${question}: ${answer}`)
        .join(" | ");
    }

    return String(item.Questions);
  };

  const csvLinkData = useMemo(() => {
    return {
      headers: CSV_Header,
      data: filteredData.map((item) => ({
        ...item,
        Questions: formatQuestionsForCsv(item),
      })),
      filename: `GDG_Recruitment_Applicants_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }, [filteredData]);

  const resetAllFilters = () => {
    setSelectedDept("All");
    setSelectedShortlisted("All");
    setGlobalFilter("");
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
      {/* Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={globalFilter || ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search applicants..."
            className="w-64 rounded-xl"
          />
          <Input
            className="w-28 rounded-xl"
            onChange={handlePageSize}
            placeholder="Page size"
            type="number"
            min="1"
          />
          <FilterDepartment filterFunc={filterFunc} />
          <FilterShortlisted filterFunc={shortlistedFilterFunc} />
          <Button variant="outline" size="sm" onClick={resetAllFilters} className="rounded-xl gap-1.5">
            <GrPowerReset className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <DialogComp selectedApplicants={showRowData} />
          <Button variant="secondary" size="sm" className="rounded-xl gap-1.5" asChild>
            <CSVLink {...csvLinkData} className="flex items-center gap-1.5">
              <IoCloudDownloadOutline className="h-4 w-4" />
              <span>Export CSV</span>
            </CSVLink>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <Table {...getTableProps()}>
          <TableHeader>
            {headerGroups.map((hg) => {
              const { key, ...headerGroupProps } = hg.getHeaderGroupProps();
              return (
                <TableRow key={key || hg.id} {...headerGroupProps}>
                  {hg.headers.map((header) => {
                    const { key: hKey, ...headerProps } = header.getHeaderProps(
                      header.getSortByToggleProps()
                    );
                    return (
                      <TableHead key={hKey || header.id} {...headerProps}>
                        <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                          {header.render("Header")}
                          <FaSortAmountDownAlt className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableHeader>
          <TableBody {...getTableBodyProps()}>
            {page.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-24 text-center text-muted-foreground">
                  No applicants found.
                </TableCell>
              </TableRow>
            ) : (
              page.map((row) => {
                prepareRow(row);
                const { key: rKey, ...rowProps } = row.getRowProps();
                const rowIdentifier = row.original._id || row.original.id || row.id;
                return (
                  <TableRow key={rKey || rowIdentifier} {...rowProps} className="hover:bg-muted/50">
                    {row.cells.map((cell) => {
                      const { key: cKey, ...cellProps } = cell.getCellProps();
                      return (
                        <TableCell key={cKey || `${rowIdentifier}-${cell.column.id}`} {...cellProps}>
                          {cell.render("Cell")}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <PaginationComp
        pageIndex={pageIndex}
        pages={pageOptions.length}
        nextPage={nextPage}
        canNext={canNextPage}
        previousPage={previousPage}
        canPrev={canPreviousPage}
        goto={gotoPage}
        pageCount={pageCount}
      />
    </div>
  );
}
