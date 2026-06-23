import json

with open('parsed_ts_tables.json', 'r') as f:
    ts_data = json.load(f)

# Build dependency graph
graph = {}
for tname, defn in ts_data.items():
    graph[tname] = set()
    for rel in defn.get('relationships', []):
        ref = rel['ref_table']
        if ref != tname: # ignore self-references
            graph[tname].add(ref)

# Topological sort
visited = {}
order = []
cycle = []

def visit(node):
    if visited.get(node) == 1:
        cycle.append(node)
        return
    if visited.get(node) == 2:
        return
    visited[node] = 1
    for dep in graph.get(node, []):
        if dep in ts_data:
            visit(dep)
    visited[node] = 2
    order.append(node)

for t in ts_data.keys():
    visit(t)

print(f"Sort order length: {len(order)}")
if cycle:
    print(f"Cycle detected: {cycle}")
else:
    print("No cycles detected!")
