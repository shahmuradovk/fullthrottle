import { describe, it, expect } from "vitest";
import { assertTransition, OrderTransitionError } from "../lib/orders";

describe("order state machine", () => {
  it("allows the forward path", () => {
    expect(() => assertTransition("PENDING_PAYMENT", "PAID")).not.toThrow();
    expect(() => assertTransition("PAID", "PREPARING")).not.toThrow();
    expect(() => assertTransition("PREPARING", "PACKED")).not.toThrow();
    expect(() =>
      assertTransition("PACKED", "SHIPPED", { carrier: "UPS", trackingNumber: "1Z1" })
    ).not.toThrow();
    expect(() => assertTransition("SHIPPED", "DELIVERED")).not.toThrow();
  });

  it("never moves backward", () => {
    expect(() => assertTransition("PACKED", "PREPARING")).toThrow(OrderTransitionError);
    expect(() => assertTransition("DELIVERED", "SHIPPED")).toThrow(OrderTransitionError);
  });

  it("never skips a step", () => {
    expect(() => assertTransition("PAID", "PACKED")).toThrow(OrderTransitionError);
    expect(() => assertTransition("PREPARING", "SHIPPED", { carrier: "UPS", trackingNumber: "x" })).toThrow(
      OrderTransitionError
    );
  });

  it("requires carrier and tracking before SHIPPED, with the exact copy", () => {
    expect(() => assertTransition("PACKED", "SHIPPED")).toThrow(
      "Enter a tracking number before marking this shipped."
    );
    expect(() => assertTransition("PACKED", "SHIPPED", { carrier: "UPS", trackingNumber: "  " })).toThrow(
      OrderTransitionError
    );
  });

  it("allows cancellation only before packing", () => {
    expect(() => assertTransition("PENDING_PAYMENT", "CANCELLED")).not.toThrow();
    expect(() => assertTransition("PAID", "CANCELLED")).not.toThrow();
    expect(() => assertTransition("PREPARING", "CANCELLED")).not.toThrow();
    expect(() => assertTransition("PACKED", "CANCELLED")).toThrow(OrderTransitionError);
    expect(() => assertTransition("SHIPPED", "CANCELLED")).toThrow(OrderTransitionError);
  });

  it("allows refunds from any paid state", () => {
    for (const from of ["PAID", "PREPARING", "PACKED", "SHIPPED", "DELIVERED"] as const) {
      expect(() => assertTransition(from, "REFUNDED")).not.toThrow();
    }
    expect(() => assertTransition("PENDING_PAYMENT", "REFUNDED")).toThrow(OrderTransitionError);
  });

  it("terminal states go nowhere", () => {
    expect(() => assertTransition("CANCELLED", "PAID")).toThrow(OrderTransitionError);
    expect(() => assertTransition("REFUNDED", "PAID")).toThrow(OrderTransitionError);
  });
});
