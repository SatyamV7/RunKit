function ASCIITableGenerator(tableData) {
    function extractData(tableData, spacePadding, horizontalHeader, verticalHeader) {
        var i, j, k, cell, item, lines, w, vAlign, hAlign, vLen, hLen, mergedData;
        var result = [];
        var arr = tableData;
        var iOffset = 0;
        var jOffset = 0;
        for (i = 0; i < arr.length; i++) {
            if (i == 0 && ('number' == horizontalHeader || 'letter' == horizontalHeader)) {
                result.push([]);
                if ('number' == verticalHeader || 'letter' == verticalHeader) {
                    result[0][0] = {
                        cell: {
                            x: 0,
                            y: 0,
                            colspan: 1,
                            rowspan: 1
                        },
                        empty: true
                    };
                    jOffset = 1;
                }
                for (j = 0; j < arr[i].length; j++) {
                    result[0][j + jOffset] = {
                        cell: {
                            x: 0,
                            y: (j + jOffset),
                            colspan: 1,
                            rowspan: 1
                        },
                        empty: true
                    };
                }
                iOffset = 1;
            }
            result.push([]);
            if ('number' == verticalHeader || 'letter' == verticalHeader) {
                result[i + iOffset][0] = {
                    cell: {
                        x: (i + iOffset),
                        y: 0,
                        colspan: 1,
                        rowspan: 1
                    },
                    empty: true
                };
                jOffset = 1;
            }
            for (j = 0; j < arr[i].length; j++) {
                mergedData = false;
                if (mergedData) {
                    cell = {
                        x: mergedData.row + iOffset,
                        y: mergedData.col + jOffset,
                        colspan: mergedData.colspan,
                        rowspan: mergedData.rowspan
                    };
                } else {
                    cell = {
                        x: i + iOffset,
                        y: j + jOffset,
                        colspan: 1,
                        rowspan: 1
                    };
                }
                item = arr[i][j];
                if (!item) {
                    result[i + iOffset][j + jOffset] = {
                        cell: cell,
                        empty: true
                    };
                } else {
                    w = 0;
                    lines = item.toString().split('\n');
                    for (k = 0; k < lines.length; k++) {
                        if (spacePadding) {
                            if (lines[k].indexOf(' ', 0) !== 0) {
                                lines[k] = ' ' + lines[k];
                            }
                            if (lines[k].indexOf(' ', lines[k].length - 1) === -1) {
                                lines[k] = lines[k] + ' ';
                            }
                        }
                        if (lines[k].length > w) {
                            w = lines[k].length;
                        }
                    }
                    hAlign = 'left';
                    vAlign = 'top';
                    result[i + iOffset][j + jOffset] = {
                        cell: cell,
                        empty: false,
                        pseudoRows: lines,
                        maxWidth: w,
                        vAlign: vAlign,
                        hAlign: hAlign
                    };
                }
            }
        }
        vLen = getVLen(result, (i + iOffset - 1), (j + jOffset - 1));
        hLen = getHLen(result, (i + iOffset - 1), (j + jOffset - 1));
        if ('none' != verticalHeader) {
            jOffset = 1;
        }
        if ('number' == horizontalHeader || 'letter' == horizontalHeader) {
            for (j = 0; j < hLen - jOffset; j++) {
                result[0][j + jOffset] = generateHeader(0, j + jOffset, horizontalHeader, spacePadding, j);
            }
        }
        if ('none' != horizontalHeader) {
            iOffset = 1;
        }
        if ('number' == verticalHeader || 'letter' == verticalHeader) {
            for (i = 0; i < vLen - iOffset; i++) {
                result[i + iOffset][0] = generateHeader(i + iOffset, 0, verticalHeader, spacePadding, i);
            }
        }
        return {
            arr: result,
            vLen: vLen,
            hLen: hLen
        };
    }

    function getVLen(arr, vMax, hMax) {
        var i, j, item, v;
        var vLen = 0;

        for (i = vMax; i >= 0; i--) {
            for (j = 0; j <= hMax; j++) {
                item = arr[i][j];
                if (!item.empty) {
                    v = item.cell.x + item.cell.rowspan;
                    if (v > vLen) {
                        vLen = v;
                    }
                }
            }
        }
        return vLen;
    }

    function getHLen(arr, vMax, hMax) {
        var i, j, item, h;
        var hLen = 0;

        for (j = hMax; j >= 0; j--) {
            for (i = 0; i <= vMax; i++) {
                item = arr[i][j];
                if (!item.empty) {
                    h = item.cell.y + item.cell.colspan;
                    if (h > hLen) {
                        hLen = h;
                    }
                }
            }
        }
        return hLen;
    }

    function generateHeader(i, j, headerType, spacePadding, id) {
        var str = "";
        var num, s;
        if (spacePadding) {
            str += ' ';
        }
        if ('letter' == headerType) {
            s = '';
            num = id;
            do {
                s = String.fromCharCode(65 + (num % 26)) + s;
                num = Math.floor(num / 26) - 1;
            } while (num > -1);
            str += s;
        } else {
            str += (id + 1).toString();
        }
        if (spacePadding) {
            str += ' ';
        }
        return {
            cell: {
                x: i,
                y: j,
                colspan: 1,
                rowspan: 1
            },
            empty: false,
            pseudoRows: [str],
            maxWidth: str.length,
            vAlign: 'middle',
            hAlign: 'center'
        };
    }

    function getWidths(data, spacePadding) {
        var widths = [];
        var mergedCells = [];
        var i, j, w, item, m, a;

        for (j = 0; j < data.hLen; j++) {
            w = 0;
            if (spacePadding) {
                w = 1;
            }
            for (i = 0; i < data.vLen; i++) {
                item = data.arr[i][j];
                if (!item.empty) {
                    if (item.cell.colspan == 1 && item.cell.rowspan == 1) {
                        if (item.maxWidth > w) {
                            w = item.maxWidth;
                        }
                    } else if (i == item.cell.x && j == item.cell.y) {
                        mergedCells.push(item);
                    }
                }
            }
            widths[j] = w;
        }
        return widths;
    }

    function getHeights(data, border, horizontalHeader, spacePadding) {
        var heights = [];
        var mergedCells = [];
        var i, j, h, item;

        for (i = 0; i < data.vLen; i++) {
            h = 0;
            if (spacePadding) {
                h = 1;
            }
            for (j = 0; j < data.hLen; j++) {
                item = data.arr[data.arr[i][j].cell.x][data.arr[i][j].cell.y];
                if (!item.empty) {
                    if (item.cell.colspan == 1 && item.cell.rowspan == 1) {
                        if (item.pseudoRows.length > h) {
                            h = item.pseudoRows.length;
                        }
                    } else if (i == item.cell.x && j == item.cell.y) {
                        mergedCells.push(item);
                    }
                }
            }
            heights[i] = h;
        }
        return heights;
    }

    function generateSeparationLine(data, widths, heights, unicode, line, charset, horizontalHeader, verticalHeader, border, i) {
        var j, k, horizontalBorderKey, generateBorder, item, offset;
        var str = '';

        if (i == -1) {
            horizontalBorderKey = 'horizontalTop';
            if ('none' == border.horizontalTop) {
                return str;
            }
        } else if (i >= data.vLen - 1) {
            horizontalBorderKey = 'horizontalBottom';
            if ('none' == border.horizontalBottom) {
                return str;
            }
        } else {
            if (hasHorizontalInnerHeader(data, border, i, horizontalHeader)) {
                horizontalBorderKey = 'horizontalInnerHeader';
            } else if (hasHorizontalInner(data, border, i)) {
                horizontalBorderKey = 'horizontalInner';
            } else {
                return str;
            }
        }
        var horizontalBorder = border[horizontalBorderKey];
        var horizontalChar = line[charset][horizontalBorder].horizontal;

        str += generateIntersection(data, border, horizontalHeader, verticalHeader, unicode, i, -1);
        for (j = 0; j < widths.length; j++) {
            generateBorder = true;
            if (i > -1) {
                item = data.arr[i][j];
                if (item.cell.x + item.cell.rowspan - 1 > i) {
                    generateBorder = false;
                    offset = calculateOffset(data, heights, border, horizontalHeader, i + 1, j) - 1;
                    str += generateCellContent(data, offset, widths, i, j);
                    j += item.cell.colspan - 1;
                }
            }
            if (generateBorder) {
                for (k = 0; k < widths[j]; k++) {
                    str += horizontalChar;
                }
            }
            str += generateIntersection(data, border, horizontalHeader, verticalHeader, unicode, i, j);
        }
        if (widths.length == 0) {
            str += generateIntersection(data, border, horizontalHeader, verticalHeader, unicode, i, widths.length);
        }
        str += '\n';
        return str;
    }

    function generateIntersection(data, border, horizontalHeader, verticalHeader, unicode, i, j) {
        var top, bottom, left, right, horizontalBorderKey, item, verticalBorderKey, intersectionChar;
        var str = '';
        if (i == -1) {
            top = true;
            bottom = false;
            horizontalBorderKey = 'horizontalTop';
        } else if (i >= data.vLen - 1) {
            top = false;
            bottom = true;
            horizontalBorderKey = 'horizontalBottom';
        } else {
            top = false;
            bottom = false;
            if (hasHorizontalInnerHeader(data, border, i, horizontalHeader)) {
                horizontalBorderKey = 'horizontalInnerHeader';
            } else if (hasHorizontalInner(data, border, i)) {
                horizontalBorderKey = 'horizontalInner';
            } else {
                return str;
            }
        }

        if (j == -1) {
            left = true;
            right = false;
            verticalBorderKey = 'verticalLeft';
        } else if (j >= data.hLen - 1) {
            left = false;
            right = true;
            verticalBorderKey = 'verticalRight';
        } else {
            left = false;
            right = false;
            if ('none' != verticalHeader && j == 0) {
                verticalBorderKey = 'verticalInnerHeader';
            } else if (j < data.hLen - 1) {
                verticalBorderKey = 'verticalInner';
            } else {
                return str;
            }
        }

        if (!top && j >= 0) {
            item = data.arr[i][j];
            if (item.cell.y + item.cell.colspan - 1 > j) {
                top = true;
            }
        }
        if (!bottom && j >= 0) {
            item = data.arr[i + 1][j];
            if (item.cell.y + item.cell.colspan - 1 > j) {
                bottom = true;
            }
        }
        if (!left && i >= 0) {
            item = data.arr[i][j];
            if (item.cell.x + item.cell.rowspan - 1 > i) {
                left = true;
            }
        }
        if (!right && i >= 0) {
            item = data.arr[i][j + 1];
            if (item.cell.x + item.cell.rowspan - 1 > i) {
                right = true;
            }
        }

        var horizontalBorder = border[horizontalBorderKey];
        var verticalBorder = border[verticalBorderKey];
        intersectionChar = unicode[(top) ? 'none' : verticalBorder][(right) ? 'none' : horizontalBorder][(bottom) ? 'none' : verticalBorder][(left) ? 'none' : horizontalBorder];
        str += intersectionChar;
        return str;
    }

    function calculateOffset(data, heights, border, horizontalHeader, i, j) {
        var offset, item, calc;
        item = data.arr[data.arr[i][j].cell.x][data.arr[i][j].cell.y];
        calc = calcultateHeight(data, border, horizontalHeader, heights, item, i);
        offset = calc.offset;
        if ('bottom' == item.vAlign) {
            offset += item.pseudoRows.length - calc.height;
        } else if ('middle' == item.vAlign) {
            offset += Math.ceil((item.pseudoRows.length - calc.height) / 2);
        } else {
            offset += 0;
        }
        return offset;
    }

    function calcultateHeight(data, border, horizontalHeader, heights, item, i) {
        var offset, height, k;
        offset = 0;
        height = heights[item.cell.x];
        for (k = 1; k < item.cell.rowspan; k++) {
            height += (hasHorizontalInnerHeader(data, border, item.cell.x + k - 1, horizontalHeader) || hasHorizontalInner(data, border, item.cell.x + k - 1)) ? 1 : 0;
            if (item.cell.x + k <= i) {
                offset = height;
            }
            height += heights[item.cell.x + k];
        }
        return {
            height: height,
            offset: offset
        };
    }

    function generateCellContent(data, offset, widths, i, j) {
        var item, width, k, entry, end;
        var str = '';
        item = data.arr[data.arr[i][j].cell.x][data.arr[i][j].cell.y];
        width = calculateWidth(widths, item);
        if (item.empty) {
            entry = '';
        } else {
            entry = item.pseudoRows[offset] || '';
        }
        if ('right' == item.hAlign) {
            end = width - entry.length;
        } else if ('center' == item.hAlign) {
            end = Math.floor((width - entry.length) / 2);
        } else {
            end = 0;
        }
        for (k = 0; k < end; k++) {
            str += ' ';
        }
        str += escapeHTMLEntities(entry);
        end = width - entry.length - end;
        for (k = 0; k < end; k++) {
            str += ' ';
        }
        return str;
    }

    function calculateWidth(widths, item) {
        var width, k;
        width = widths[item.cell.y];
        for (k = 1; k < item.cell.colspan; k++) {
            width += 1;
            width += widths[item.cell.y + k];
        }
        return width;
    }

    function hasHorizontalInnerHeader(data, border, i, horizontalHeader) {
        return ('none' != border.horizontalInnerHeader && 'none' != horizontalHeader && i == 0 && data.vLen > 1);
    }

    function hasHorizontalInner(data, border, i) {
        return ('none' != border.horizontalInner && i < data.vLen - 1);
    }

    function escapeHTMLEntities(text) {
        return text.replace(/[<>\&]/g, function (c) {
            return '&#' + c.charCodeAt(0) + ';';
        });
    }

    var unicode = {
        none: {
            none: {
                double: {
                    double: '╗'
                },
            },
            double: {
                none: {
                    double: '═'
                },
                double: {
                    none: '╔',
                    double: '╦'
                },
            },
        },
        double: {
            none: {
                none: {
                    double: '╝'
                },
                double: {
                    none: '║',
                    double: '╣'
                },
            },
            double: {
                none: {
                    none: '╚',
                    double: '╩'
                },
                double: {
                    none: '╠',
                    double: '╬'
                }
            }
        }
    };

    var line = {
        unicode: {
            double: {
                vertical: unicode.double.none.double.none,
                horizontal: unicode.none.double.none.double
            }
        }
    };

    var spacePadding = true;
    var charset = 'unicode';
    var horizontalHeader = 'first_line';
    var verticalHeader = 'none';

    var border = {
        horizontalTop: 'double',
        horizontalInnerHeader: 'double',
        horizontalInner: 'double',
        horizontalBottom: 'double',
        verticalLeft: 'double',
        verticalInnerHeader: 'double',
        verticalInner: 'double',
        verticalRight: 'double',
    };

    var data = extractData(tableData, spacePadding, horizontalHeader, verticalHeader);
    var widths = getWidths(data, spacePadding);
    var heights = getHeights(data, border, horizontalHeader, spacePadding);
    var str = "";
    var i, j, m, offsets;

    // top
    str += generateSeparationLine(data, widths, heights, unicode, line, charset, horizontalHeader, verticalHeader, border, -1);

    // rows
    for (i = 0; i < data.vLen; i++) {
        offsets = [];
        for (j = 0; j < widths.length; j++) {
            offsets[j] = calculateOffset(data, heights, border, horizontalHeader, i, j);
        }

        for (m = 0; m < heights[i]; m++) {
            str += line[charset][border.verticalLeft].vertical;
            for (j = 0; j < widths.length; j++) {
                str += generateCellContent(data, offsets[j] + m, widths, i, j);
                j += data.arr[i][j].cell.colspan - 1;
                if ('none' != verticalHeader && j == 0 && data.hLen > 1) {
                    str += line[charset][border.verticalInnerHeader].vertical;
                } else if (j < widths.length - 1) {
                    str += line[charset][border.verticalInner].vertical;
                }
            }
            str += line[charset][border.verticalRight].vertical;
            str += '\n';
        }

        str += generateSeparationLine(data, widths, heights, unicode, line, charset, horizontalHeader, verticalHeader, border, i);
    }
    if (data.vLen == 0) {
        str += generateSeparationLine(data, widths, heights, unicode, line, charset, horizontalHeader, verticalHeader, border, data.vLen);
    }
    return str.trim();
}

function HTMLTableGenerator(data) {
    let HTML = '<table>';

    for (let row of data) {
        HTML += '<tr>';
        for (let cell of row) {
            HTML += `<td>${cell === null ? '' : cell}</td>`;
        }
        HTML += '</tr>';
    }

    HTML += '</table>';
    return HTML;
}

function TableGenerator(data, type) {
    if (type === null) return data;
    if (type === 'ASCII') return ASCIITableGenerator(data);
    if (type === 'HTML') return HTMLTableGenerator(data);
}