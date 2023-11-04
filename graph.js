// Implementation of a graph with finding minimal-distance paths
// between vertices.
//
// Part of the Colorful Lines game
//
// Eli Bendersky [https://eli.thegreenplace.net]
// This code is in the public domain.

// The vertices are integers. The successor function must accept
// a vertex and return an array of vertices.
function Graph(vertices, successors_func) {
    var self = this;
    this.graph = [];

    for (var i = 0; i < vertices.length; ++i) {
        var vertex = vertices[i];

        var entry = {
            d:      100000,
            pred:   null
        };

        this.graph[vertex] = entry;
        this.successors_func = successors_func;
    }

    this.clear = function () {
        for (var i = 0; i < this.graph.length; ++i) {
            if (this.graph[i] !== undefined) {
                this.graph[i] = {d: 100000, pred: null};
            }
        }
    }

    // Finds a path from the source to the destination (both must
    // be valid vertices of the graph).
    // If a path exists, returns an array representing the
    // vertices that must be visited from source to get to the
    // destination (the path includes the destination but not the
    // source).
    // If no path exists, returns null.
    this.find_path = function (source, dest) {
        // Init source path estimation
        //
        this.graph[source].d = 0;

        var queue = [];
        for (var i = 0; i < this.graph.length; ++i) {
            var v = this.graph[i];
            if (v !== undefined) {
                queue.push(i);
            }
        }

        while (queue.length > 0) {
            // Keep the priority-queue order, lowest cost first.
            // Note: this isn't very efficient, a heap would
            // be better here. However, for our simple needs this is
            // enough.
            queue.sort(function (a, b) {
                return self.graph[a].d - self.graph[b].d;
            });

            // extract minimum
            var u = queue.shift()

            // For each vertex adjacent to u, relax all edges leaving
            // it - that is, improve (if possible) the shortest path
            // estimate to v by going through u.
            var u_succ = this.successors_func(u);
            for (var i in u_succ) {
                var v = u_succ[i];

                if (this.graph[v].d > this.graph[u].d + 1) {
                    this.graph[v].d = this.graph[u].d + 1;
                    this.graph[v].pred = u;
                }
            }
        }

        // Reconstruct path to destination
        if (this.graph[dest].pred !== null) {
            var path = [];
            var iter = dest;

            while (iter !== source) {
                path.unshift(iter);
                iter = this.graph[iter].pred;
            }

            return path;
        } else {
            // No path
            return null;
        }
    }
}
