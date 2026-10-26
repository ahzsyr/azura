import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MANAGED_ROLES,
  ROLE_NOT_PERMITTED_MESSAGE,
  assignableRoles,
  canChangeRole,
  canManageOwnSecurity,
  canManageUser,
  canManageUserSecurity,
  outranks,
  roleLabel,
  roleRank,
} from "@/features/auth/role-policy";

/**
 * Role hierarchy:
 *   SUPER_ADMIN > ADMIN > CUSTOMER
 *
 * - Super Admin manages every account and promotes/demotes between customer
 *   and admin.
 * - Admin manages normal users only — never another Admin or the Super Admin.
 * - Everybody manages their own security.
 *
 * These are the boundaries the server actions call, so they are tested as the
 * contract the endpoints implement.
 */

const SUPER = { id: "u-super", role: "SUPER_ADMIN" };
const ADMIN = { id: "u-admin", role: "ADMIN" };
const OTHER_ADMIN = { id: "u-admin-2", role: "ADMIN" };
const CUSTOMER = { id: "u-customer", role: "CUSTOMER" };

function manage(actor: { id: string; role: string }, target: { id: string; role: string }) {
  return canManageUser({
    actorId: actor.id,
    actorRole: actor.role,
    targetId: target.id,
    targetRole: target.role,
  });
}

describe("role ranking", () => {
  it("orders the three supported roles", () => {
    assert.deepEqual([...MANAGED_ROLES], ["SUPER_ADMIN", "ADMIN", "CUSTOMER"]);
    assert.equal(roleRank("SUPER_ADMIN"), 2);
    assert.equal(roleRank("ADMIN"), 1);
    assert.equal(roleRank("CUSTOMER"), 0);
    assert.equal(roleRank("unknown"), -1);
  });

  it("only strictly-higher roles outrank", () => {
    assert.equal(outranks("SUPER_ADMIN", "ADMIN"), true);
    assert.equal(outranks("SUPER_ADMIN", "CUSTOMER"), true);
    assert.equal(outranks("ADMIN", "CUSTOMER"), true);
    assert.equal(outranks("ADMIN", "ADMIN"), false);
    assert.equal(outranks("ADMIN", "SUPER_ADMIN"), false);
    assert.equal(outranks("CUSTOMER", "CUSTOMER"), false);
    assert.equal(outranks(null, "CUSTOMER"), false);
  });

  it("labels roles for the UI", () => {
    assert.equal(roleLabel("SUPER_ADMIN"), "Super Admin");
    assert.equal(roleLabel("ADMIN"), "Admin");
    assert.equal(roleLabel("CUSTOMER"), "Customer");
  });
});

describe("Super Admin (Master Admin) can manage users", () => {
  it("manages Admins and customers", () => {
    assert.equal(manage(SUPER, ADMIN), true);
    assert.equal(manage(SUPER, CUSTOMER), true);
  });

  it("cannot manage itself through the user-management surface", () => {
    assert.equal(manage(SUPER, SUPER), false);
    assert.equal(manage(SUPER, { id: SUPER.id, role: "CUSTOMER" }), false);
  });

  it("manages the security settings of Admins and customers", () => {
    assert.equal(
      canManageUserSecurity({
        actorId: SUPER.id,
        actorRole: SUPER.role,
        targetId: ADMIN.id,
        targetRole: ADMIN.role,
      }),
      true,
    );
  });
});

describe("Admin can manage normal users only", () => {
  it("manages customers", () => {
    assert.equal(manage(ADMIN, CUSTOMER), true);
  });

  it("cannot manage, edit or reset another Admin", () => {
    assert.equal(manage(ADMIN, OTHER_ADMIN), false);
    assert.equal(manage(ADMIN, { ...OTHER_ADMIN, role: "ADMIN" }), false);
    assert.equal(
      canManageUserSecurity({
        actorId: ADMIN.id,
        actorRole: ADMIN.role,
        targetId: OTHER_ADMIN.id,
        targetRole: OTHER_ADMIN.role,
      }),
      false,
    );
  });

  it("cannot manage the Super Admin", () => {
    assert.equal(manage(ADMIN, SUPER), false);
  });

  it("cannot manage itself in the user list", () => {
    assert.equal(manage(ADMIN, { id: ADMIN.id, role: "ADMIN" }), false);
  });

  it("cannot assign any role", () => {
    assert.deepEqual(assignableRoles("ADMIN"), []);
    assert.equal(
      canChangeRole({
        actorId: ADMIN.id,
        actorRole: ADMIN.role,
        targetId: CUSTOMER.id,
        targetRole: CUSTOMER.role,
        nextRole: "ADMIN",
      }),
      false,
    );
  });
});

describe("role changes (promote / demote)", () => {
  const base = {
    actorId: SUPER.id,
    actorRole: SUPER.role,
  };

  it("Super Admin promotes a customer to Admin", () => {
    assert.equal(
      canChangeRole({ ...base, targetId: CUSTOMER.id, targetRole: "CUSTOMER", nextRole: "ADMIN" }),
      true,
    );
  });

  it("Super Admin demotes an Admin to a normal user", () => {
    assert.equal(
      canChangeRole({ ...base, targetId: ADMIN.id, targetRole: "ADMIN", nextRole: "CUSTOMER" }),
      true,
    );
    assert.deepEqual(assignableRoles("SUPER_ADMIN"), ["CUSTOMER", "ADMIN"]);
  });

  it("refuses a no-op change", () => {
    assert.equal(
      canChangeRole({ ...base, targetId: ADMIN.id, targetRole: "ADMIN", nextRole: "ADMIN" }),
      false,
    );
  });

  it("never promotes or demotes to SUPER_ADMIN", () => {
    assert.equal(
      canChangeRole({ ...base, targetId: ADMIN.id, targetRole: "ADMIN", nextRole: "SUPER_ADMIN" }),
      false,
    );
    assert.equal(
      canChangeRole({
        ...base,
        targetId: CUSTOMER.id,
        targetRole: "CUSTOMER",
        nextRole: "SUPER_ADMIN",
      }),
      false,
    );
  });

  it("never touches the Super Admin account", () => {
    assert.equal(
      canChangeRole({
        ...base,
        targetId: "someone-else",
        targetRole: "SUPER_ADMIN",
        nextRole: "ADMIN",
      }),
      false,
    );
  });

  it("refuses changing your own role", () => {
    assert.equal(
      canChangeRole({ ...base, targetId: SUPER.id, targetRole: "SUPER_ADMIN", nextRole: "ADMIN" }),
      false,
    );
  });

  it("an Admin cannot promote anyone, including themselves", () => {
    assert.equal(
      canChangeRole({
        actorId: ADMIN.id,
        actorRole: ADMIN.role,
        targetId: CUSTOMER.id,
        targetRole: "CUSTOMER",
        nextRole: "ADMIN",
      }),
      false,
    );
    assert.equal(
      canChangeRole({
        actorId: ADMIN.id,
        actorRole: ADMIN.role,
        targetId: ADMIN.id,
        targetRole: "CUSTOMER",
        nextRole: "ADMIN",
      }),
      false,
    );
  });

  it("a customer cannot promote themselves", () => {
    assert.equal(
      canChangeRole({
        actorId: CUSTOMER.id,
        actorRole: CUSTOMER.role,
        targetId: CUSTOMER.id,
        targetRole: CUSTOMER.role,
        nextRole: "ADMIN",
      }),
      false,
    );
  });
});

describe("self-service security", () => {
  it("every signed-in user manages their own account", () => {
    for (const user of [SUPER, ADMIN, CUSTOMER]) {
      assert.equal(canManageOwnSecurity({ actorId: user.id, targetId: user.id }), true);
    }
  });

  it("cannot manage someone else's security through the self-service path", () => {
    assert.equal(canManageOwnSecurity({ actorId: CUSTOMER.id, targetId: ADMIN.id }), false);
    assert.equal(canManageOwnSecurity({ actorId: null, targetId: CUSTOMER.id }), false);
  });
});

describe("error copy does not leak account existence", () => {
  it("denials for another Admin and for the Super Admin are the same message", () => {
    assert.equal(ROLE_NOT_PERMITTED_MESSAGE, "You do not have permission to change this account.");
  });
});
