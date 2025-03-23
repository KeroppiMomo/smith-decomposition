//let matrix = [
//    [0, 111, -36, 6], 
//    [5, -672, 210, 74], 
//    [0, -255, 81, 24], 
//    [-7, 255, -81, -10], 
//];

// Run the division algorithm a = q*a + r,
// keeping 0 <= r < a.
// Returns [q, r].
function divide(a, b) {
    let mod = a % b;
    mod = (mod + b) % b;
    return [Math.round((a-mod)/b), Math.round(mod)];
}

class RowSwap {
    constructor(row1, row2) {
        this.row1 = row1;
        this.row2 = row2;
    }
    apply(mat) {
        for (let j=0; j<mat[0].length; ++j) {
            const tmp = mat[this.row1][j];
            mat[this.row1][j] = mat[this.row2][j];
            mat[this.row2][j] = tmp;
        }
    }
    toString() {
        return `Swap rows ${this.row1}, ${this.row2}`;
    }
}

class ColSwap {
    constructor(col1, col2) {
        this.col1 = col1;
        this.col2 = col2;
    }
    apply(mat) {
        for (let i=0; i<mat.length; ++i) {
            const tmp = mat[i][this.col1];
            mat[i][this.col1] = mat[i][this.col2];
            mat[i][this.col2] = tmp;
        }
    }
    toString() {
        return `Swap cols ${this.col1}, ${this.col2}`;
    }
}

class RowAdd {
    constructor(fromRow, mult, toRow) {
        this.fromRow = fromRow;
        this.mult = mult;
        this.toRow = toRow;
    }
    apply(mat) {
        for (let j=0; j<mat[0].length; ++j) {
            mat[this.toRow][j] = Math.round(
                mat[this.toRow][j] + this.mult * mat[this.fromRow][j]
            );
        }
    }
    toString() {
        return `Add ${this.mult} times row ${this.fromRow} to row ${this.toRow}`;
    }
}

class ColAdd {
    constructor(fromCol, mult, toCol) {
        this.fromCol = fromCol;
        this.mult = mult;
        this.toCol = toCol;
    }
    apply(mat) {
        for (let i=0; i<mat.length; ++i) {
            mat[i][this.toCol] = Math.round(
                mat[i][this.toCol] + this.mult * mat[i][this.fromCol]
            );
        }
    }
    toString() {
        return `Add ${this.mult} times col ${this.fromCol} to col ${this.toCol}`;
    }
}

function* makeFirstRowDivisible(mat, top, col) {
    yield { desc: `2: making (${top}, ${col}) divisible by (${top}, ${top})`, indent: +1 };
    while (mat[top][col] % mat[top][top] != 0) {
        const [q, r] = divide(mat[top][col], mat[top][top]);
        yield { desc: "2.1", op: new ColAdd(top, -q, col) };
        yield { desc: "2.2", op: new ColSwap(top, col) };
    }
    yield { indent: -1 };
}
function* purgeFirstRow(mat, top) {
    for (let j=top+1; j < mat[0].length; ++j) {
        yield* makeFirstRowDivisible(mat, top, j);
    }
    yield { desc: `3: purging row ${top}`, indent: +1 };
    for (let j=top+1; j < mat[0].length; ++j) {
        const q = mat[top][j] / mat[top][top];
        if (q != 0)
            yield { desc: "3", op: new ColAdd(top, -q, j) };
    }
    yield { indent: -1 };
}

function* makeFirstColDivisible(mat, top, row) {
    yield { desc: `4: making (${row}, ${top}) divisible by (${top}, ${top})`, indent: +1 };
    while (mat[row][top] % mat[top][top] != 0) {
        const [q, r] = divide(mat[row][top], mat[top][top]);
        yield { desc: "4.1", op: new RowAdd(top, -q, row) };
        yield { desc: "4.2", op: new RowSwap(top, row) };
        yield* purgeFirstRow(mat, top);
    }
    yield { indent: -1 };
}

function* purgeFirstCol(mat, top) {
    for (let i=top+1; i < mat.length; ++i) {
        yield* makeFirstColDivisible(mat, top, i);
    }
    yield { desc: `5: purging col ${top}`, indent: +1 };
    for (let i=top+1; i < mat.length; ++i) {
        const q = mat[i][top] / mat[top][top];
        if (q != 0)
            yield { desc: "5", op: new RowAdd(top, -q, i) };
    }
    yield { indent: -1 };
}

function* makeEntryDivisible(mat, top, row, col) {
    yield { desc: `6: making (${row}, ${col}) divisible by (${top}, ${top})`, indent: +1 };
    while (mat[row][col] % mat[top][top] != 0) {
        const [q, r] = divide(mat[row][col], mat[top][top]);
        yield { desc: "6.1", op: new ColAdd(top, 1, col) };
        yield { desc: "6.2", op: new RowAdd(top, -q, row) };
        yield { desc: "6.3", op: new ColSwap(top, col) };
        yield { desc: "6.3", op: new RowSwap(top, row) };
        yield* purgeFirstRow(mat, top);
        yield* purgeFirstCol(mat, top);
    }
    yield { indent: -1 };
}
function* makeSubmatrixDivisible(mat, top) {
    for (let i=top+1; i<mat.length; ++i) {
        for (let j=top+1; j<mat[0].length; ++j) {
            yield* makeEntryDivisible(mat, top, i, j);
        }
    }
}

function findNonZeroTop(mat, top) {
    outer:
    for (let i=top; i<mat.length; ++i) {
        for (let j=top; j<mat[0].length; ++j) {
            if (mat[i][j] != 0) {
                return [i, j];
            }
        }
    }
    return [null, null];
}

function* smithDecompose(mat) {
    for (let top=0; top<mat.length && top<mat[0].length; ++top) {
        yield { desc: `Top left entry (${top}, ${top})`, indent: +1 };
        const [nonZeroI, nonZeroJ] = findNonZeroTop(mat, top);
        if (nonZeroI === null) {
            yield { desc: `1: all zero, done` };
            return;
        } else {
            yield { desc: `1: ensuring (${top}, ${top}) is non-zero`, indent: +1 };
            if (nonZeroI != top) {
                yield { desc: "1", op: new RowSwap(top, nonZeroI) };
            }
            if (nonZeroJ != top) {
                yield { desc: "1", op: new ColSwap(top, nonZeroJ) };
            }
            yield { indent: -1 };
        }
        yield* purgeFirstRow(mat, top);
        yield* purgeFirstCol(mat, top);
        yield* makeSubmatrixDivisible(mat, top);
        yield { indent: -1 };
    }
}

function matrixToString(mat) {
    const padLength = 6;
    let output = "";
    for (let i=0; i<mat.length; ++i) {
        if (i === 0) output += "[ ";
        else output += ",\n  ";
        output += "[";
        for (let j=0; j<mat[i].length; ++j) {
            if (j !== 0) output += ", ";
            output += mat[i][j].toFixed(0).padStart(padLength);
        }
        output += " ]";
    }
    output += " ]";
    return output;
}

function indent(str, level) {
    indentStr = "| ".repeat(level);
    return str.split("\n").map((s) => indentStr + s).join("\n");
}

function makeOutput(mat) {
    const gen = smithDecompose(mat);
    let indentLevel = 0;
    let output = "";
    while (true) {
        const result = gen.next();
        if (result.done) break;
        if (result.value.desc) {
            output += indent(result.value.desc, indentLevel) + "\n";
        }
        if (result.value.op) {
            result.value.op.apply(mat);
            output += indent(result.value.op.toString(), indentLevel) + "\n";
            output += indent(matrixToString(mat), indentLevel) + "\n";
        }

        if (result.value.indent) {
            indentLevel += result.value.indent;
        }
        output += indent("", indentLevel) + "\n";
    }
    return output;
}

// console.log(makeOutput(matrix))
