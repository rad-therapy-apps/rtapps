# @rtapps/schemas

The closed ProseMirror document schema shared by the editor, the API validator, the migration mapper, and the renderer.

To add a node: amend ADR-0003 and add a fixture here. Then add it to the `block` or `inline` union in `prose-doc.schema.json` in **both** places: its `type` name in the union's `enum`, and an `if`/`then` entry pointing at its definition.

The unions dispatch on the node's `type` with `if`/`then` instead of listing the definitions under `oneOf`. Both accept and reject exactly the same documents, but `oneOf` has to validate every node against every definition to prove that exactly one matches. On the migrated seed content (1,024 documents) that cost 11.8 s in the Python validator; dispatching on `type` takes 1.6 s, and it made the API test suite's seed tests several times faster.
