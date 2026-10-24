# Use case diagram — partner-api — Website integration with scoped keys

> **Source spec**: [partner API](../../specs/partner-api.md) § 2, § 8

Status: proposed, awaiting Benoît's validation.

Question answered: what can a partner site do with a key, and which actions stay with members?

```mermaid
flowchart LR
  Malik(["👤 Association member<br/>(Malik)"])
  Site(["⚙ Partner website server<br/>«system actor»"])
  Job(["⏱ Maintenance job<br/>«system actor»"])

  subgraph HH["HappiHub — Website integration"]
    UC27(["UC27 Manage API keys<br/>(name, scopes read / read+write)"])
    UC28(["UC28 Retrieve association events"])
    UC34(["UC34 Create an event draft"])
    UC35(["UC35 Edit an own event draft"])
    UC18(["UC18 Publish an event"])
    AUTH(["Authenticate key<br/>and check scope"])
  end

  Malik --- UC27
  Malik --- UC18
  Site --- UC28
  Site --- UC34
  Site --- UC35
  Job --- UC27
  UC28 -. "«include»" .-> AUTH
  UC34 -. "«include»" .-> AUTH
  UC35 -. "«include»" .-> AUTH
```

## Notes

- The maintenance job takes part in UC27 only for automatic revocation (I1).
- UC18 is the unchanged member publication: a partner never publishes (D0). It appears here
  because it ends every UC34 flow.
- No use case lets a key manage keys, members, or cancel and delete events (threat T8).
