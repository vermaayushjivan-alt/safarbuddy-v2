"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getVendorBranchesAdmin,
  createVendorBranchAdmin,
  updateVendorBranchAdmin,
  deleteVendorBranchAdmin,
} from "@/app/actions/vendor.actions";
import type { VendorBranchRecord } from "@/lib/repositories/vendor.repository";

interface VendorBranchManagerProps {
  vendorId: string;
}

const emptyBranchForm = { branch_name: "", address: "", city: "" };

export function VendorBranchManager({ vendorId }: VendorBranchManagerProps) {
  const [branches, setBranches] = useState<VendorBranchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newBranch, setNewBranch] = useState(emptyBranchForm);

  async function refresh() {
    const data = await getVendorBranchesAdmin(vendorId);
    setBranches(data);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getVendorBranchesAdmin(vendorId);
        if (active) setBranches(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load branches");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [vendorId]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createVendorBranchAdmin(vendorId, newBranch);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNewBranch(emptyBranchForm);
      await refresh();
    });
  }

  function handleToggleActive(branch: VendorBranchRecord) {
    setError(null);
    startTransition(async () => {
      const result = await updateVendorBranchAdmin(branch.id, {
        is_active: !branch.is_active,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  }

  function handleDelete(branchId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteVendorBranchAdmin(branchId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="space-y-3 rounded-2xl border border-deep/15 bg-white p-4"
      >
        <h2 className="font-heading text-[13px] font-semibold text-deep">
          Add Branch
        </h2>
        <input
          type="text"
          required
          placeholder="Branch name"
          value={newBranch.branch_name}
          onChange={(e) =>
            setNewBranch((prev) => ({ ...prev, branch_name: e.target.value }))
          }
          className={inputClass}
        />
        <input
          type="text"
          placeholder="City"
          value={newBranch.city}
          onChange={(e) =>
            setNewBranch((prev) => ({ ...prev, city: e.target.value }))
          }
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Address"
          value={newBranch.address}
          onChange={(e) =>
            setNewBranch((prev) => ({ ...prev, address: e.target.value }))
          }
          className={inputClass}
        />
        <button
          type="submit"
          disabled={isPending}
          className="focus-ring rounded-xl bg-deep px-4 py-2 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Add Branch"}
        </button>
      </form>

      {loading ? (
        <p className="text-[13px] text-ink/50">Loading branches...</p>
      ) : branches.length === 0 ? (
        <p className="text-[13px] text-ink/50">No branches yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-deep/15 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3 font-heading font-semibold">Branch</th>
                <th className="px-4 py-3 font-heading font-semibold">City</th>
                <th className="px-4 py-3 font-heading font-semibold">Status</th>
                <th className="px-4 py-3 font-heading font-semibold text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-b border-deep/10 last:border-0">
                  <td className="px-4 py-3 font-medium text-deep">
                    {branch.branch_name}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{branch.city ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-deep">
                      {branch.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(branch)}
                        disabled={isPending}
                        className="focus-ring rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist disabled:opacity-50"
                      >
                        {branch.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(branch.id)}
                        disabled={isPending}
                        className="focus-ring rounded-lg border border-red-200 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "focus-ring w-full rounded-xl border border-deep/15 px-3.5 py-2.5 text-[14px] text-deep outline-none transition focus:border-deep/40";
