# Experiment Governor

### Zero Protocol — CodeSplash'26 Agentic AI Phase

Experiment Governor is an agentic decision system designed to help early-stage startup founders and product/growth leaders decide **what to experiment on next under real organizational constraints**.

Instead of simply ranking experiments, Experiment Governor evaluates available budget, engineering capacity, customer traffic, existing commitments, dependencies, opportunity cost, and the information an experiment can provide. It produces an auditable strategy that can include conditional experiment sequences, approvals, controlled actions, and event-driven replanning.

---

## Problem

Early-stage startups often have more potential experiments than their available budget, engineering capacity, customer traffic, and management attention can support.

Choosing an experiment in isolation can:

- Consume engineering capacity needed for an existing commitment
- Exhaust limited budget or customer traffic
- Delay important projects
- Encourage premature investment before key assumptions are validated
- Become outdated when circumstances change

Experiment Governor addresses this by treating experimentation as a **sequential organizational decision problem**.

The system helps answer:

> **What should the startup learn next, given its current resources, commitments, uncertainty, and strategic goals?**

---

## Solution

Experiment Governor receives a high-level founder objective together with the startup's current organizational state and proposed experiments.

It then follows an agentic decision loop:

```text
Perceive → Decide → Act → Observe → Adapt