
document.querySelector('body').style.backgroundColor = '#000000'

const cv = document.querySelector('#gg')

// initialize kaboom context
const k = kaboom({
    global: true,
    canvas: cv,
    width: window.innerWidth,
    height: window.innerHeight,
    debug: true
});

// define a scene
k.scene("mapgen", () => {
    
    function cell_coords(col, row){
        return {
            x(){
                return col
            },
            y(){
                return row
            }
        }
    }

    const ROWS = 59
    const COLS = 35
    const CELLSIZE = 25
    const PIXELS = 25

    const g = new Grid(COLS, ROWS)
    const FILLED = rgb(.1,.05,0)
    const VERTEX = rgb(1,0,0)
    const EDGE = rgb(.2,.8,1)
    let px = PIXELS
    let py = PIXELS
    for(let y = 1; y <= g.height; y++){
        for(let x = 1; x <= g.width; x++){
            let clr;
            /*if(g.isVertex(x, y)){
                clr = VERTEX
            } else if(g.isEdge(x, y)){
                clr = EDGE
            } else {*/
                clr = FILLED
            /*}*/
            add([
                "cell",
                rect(CELLSIZE, CELLSIZE),
                pos(px, py),
                color(clr),
                cell_coords(x, y),
                `${x}-${y}`
            ])
            px += CELLSIZE
        }
        px = PIXELS
        py += CELLSIZE
    }

    const MAXROOMDIM = Math.floor(Math.min(COLS, ROWS) / 5)
    
    function validRoomBorders(x, y, w, h){
        let valid = true 
        for(var px = 0; px < x + w + 2; px++){
            if(g.isBorder(x, y - 1)){
                break
            } else {
                if(g.isCarved(px, y - 2)){
                    valid = false
                    break
                }
            }
            px++
        }
        for(var py = 0; py < y + h + 2; py++){
            if(!valid || g.isBorder(x + w, y)){
                break
            } else {
                if(g.isCarved(x + w + 1, py)){
                    valid = false
                    break
                }
            }
            py++
        }
        for(var px = x + w - 1; px >= x - 2; px--){
            if(!valid || g.isBorder(x, y + h + 1)){
                break
            } else {
                if(g.isCarved(px, y + h + 2)){
                    valid = false
                    break
                }
            }
            px--
        }
        for(var py = y + h + 1; py >= y - 2; py--){
            if(!valid || g.isBorder(x - 1, y)){
                break
            } else {
                if(g.isCarved(x - 2, py)){
                    valid = false
                    break
                }
            }
            py--
        }
        return valid
    }

    const roomRegistry = []

    function tryPlaceRoom(){
        let w = Math.floor(rand(3, MAXROOMDIM + 1))
        w = w % 2 === 0 ? w - 1 : w
        let h = Math.floor(rand(3, MAXROOMDIM + 1))
        h = h % 2 === 0 ? h - 1 : h
        let startx = Math.floor(rand(2, COLS))
        startx = startx % 2 === 0 ? startx : startx - 1
        let starty = Math.floor(rand(2, ROWS))
        starty = starty % 2 === 0 ? starty : starty - 1
        let invalid = false
        if(startx + w - 1 < COLS && starty + h - 1 < ROWS){
            for(let y = 0; y < h; y++){
                for(let x = 0; x < w; x++){
                    if(startx + x >= g.width || starty + y >= g.height){
                        invalid = true
                    }
                    if(g.isCarved(x+startx, y+starty)){
                        invalid = true
                    }
                    if(invalid){
                        break
                    }
                }
                if(invalid){
                    break
                }
            }
            if(!invalid && !validRoomBorders(startx, starty, w, h)){
                invalid = true
            }
            if(!invalid){
                roomRegistry.push({
                    'x': startx,
                    'y': starty,
                    'w': w,
                    'h': h
                })
                for(let y = 0; y < h; y++){
                    for(let x = 0; x < w; x++){
                        g.carve(x+startx, y+starty)
                        g.dirty(x+startx, y+starty)
                    }
                }
            }
        }
    }
    
    const vertsPerRow = Math.floor(g.width / 2) 
    const vertsPerCol = Math.floor(g.height / 2) 
    const numVertices = vertsPerRow * vertsPerCol

    function randStartingVert(){
        let i, y, x
        do {
            i = Math.floor(rand(1, numVertices))
            y = Math.floor(i / vertsPerRow) * 2 + 2
            if(i <= vertsPerRow){
                x = i * 2
            } else if(i % vertsPerRow === 0){
                x = vertsPerRow
            } else {
                x = (i - (vertsPerRow * Math.floor(i / vertsPerRow))) * 2
            }
        } while(g.isCarved(x, y) || g.isBorder(x, y) || !g.isVertex(x, y))
        return [x, y]
    }

    function validNeighbor(x, y, d){
        /*
         * 1 — north
         * 2 — east
         * 3 — south
         * 4 or * - west
         */
        if(d===1){
             return !g.isBorder(x, y - 1) && !g.isCarved(x, y - 1) && !g.isBorder(x, y - 2) && !g.isCarved(x, y - 2)
        } else if(d===2){
             return !g.isBorder(x + 1, y) && !g.isCarved(x + 1, y) && !g.isBorder(x + 2, y) && !g.isCarved(x + 2, y)
        } else if(d===3){
             return !g.isBorder(x, y + 1) && !g.isCarved(x, y + 1) && !g.isBorder(x, y + 2) && !g.isCarved(x, y + 2)
        } else {
             return !g.isBorder(x - 1, y) && !g.isCarved(x - 1, y) && !g.isBorder(x - 2, y) && !g.isCarved(x - 2, y)
        }
    }
    
    const crawlStack = [g.getIdx(...randStartingVert())]

    function crawl(){
        if(crawlStack.length > 0){
            const x = g.colOf(crawlStack[crawlStack.length-1])
            const y = g.rowOf(crawlStack[crawlStack.length-1])
            const options = []
            validNeighbor(x, y, 1) && options.push([
                g.getIdx(x, y - 1),
                g.getIdx(x, y - 2)
            ])
            validNeighbor(x, y, 2) && options.push([
                g.getIdx(x + 1, y),
                g.getIdx(x + 2, y)
            ])
            validNeighbor(x, y, 3) && options.push([
                g.getIdx(x, y + 1),
                g.getIdx(x, y + 2)
            ])
            validNeighbor(x, y, 4) && options.push([
                g.getIdx(x - 1, y),
                g.getIdx(x - 2, y)
            ])
            if(!g.isCarved(x, y)){
                g.carve(x, y)
                g.dirty(x, y)
            }
            if(options.length > 0){
                const [corridor, neighbor] = choose(options)
                g.carve(g.colOf(corridor), g.rowOf(corridor))
                g.dirty(g.colOf(corridor), g.rowOf(corridor))
                g.carve(g.colOf(neighbor), g.rowOf(neighbor))
                g.dirty(g.colOf(neighbor), g.rowOf(neighbor))
                crawlStack.push(neighbor)
            } else {
                crawlStack.pop()
            }
        } 
    }

    let roomsLinked = 0

    function linkRoom(){
        const r = roomRegistry[roomsLinked]
        /*
         * ROOM SCHEMA
         * x
         * y
         * w
         * h
         *
         * SIDES LEGEND
         * 1 - North
         * 2 - East
         * 3 - South
         * 4 - West
         */
        const sides = []
        if(!g.isBorder(r['x'], r['y'] - 1)){
            sides.push(1)
        } 
        if(!g.isBorder(r['x'] + r['w'], r['y'])){
            sides.push(2)
        }
        if(!g.isBorder(r['x'], r['y'] + r['h'])){
            sides.push(3)
        }
        if(!g.isBorder(r['x'] - 1, r['y'])){
            sides.push(4)
        }
        let s = choose(sides)
        let offset = s % 2 === 0 ? Math.floor(rand(0, r['h'] - 1)) : Math.floor(rand(0, r['w'] - 1))
        if(offset % 2 != 0){
            offset -= 1
        }
        let idx
        if(s === 1){
            const x = r['x'] + offset 
            const y = r['y'] - 1
            g.carve(x, y)
            g.dirty(x, y)
            g.setVertDoor(x, y)
            idx = sides.indexOf(1)
        } else if(s === 2){
            const x = r['x'] + r['w']
            const y = r['y'] + offset
            g.carve(x, y)
            g.dirty(x, y)
            g.setHorzDoor(x, y)
            idx = sides.indexOf(2)
        } else if(s === 3){
            const x = r['x'] + offset
            const y = r['y'] + r['h']
            g.carve(x, y)
            g.dirty(x, y)
            g.setVertDoor(x, y)
            idx = sides.indexOf(3)
        } else {
            const x = r['x'] - 1
            const y = r['y'] + offset
            g.carve(x, y)
            g.dirty(x, y)
            g.setHorzDoor(x, y)
            idx = sides.indexOf(4)
        }
        sides.splice(idx, 1)
        s = choose(sides)
        offset = s % 2 === 0 ? Math.floor(rand(0, r['h'] - 1)) : Math.floor(rand(0, r['w'] - 1))
        if(offset % 2 != 0){
            offset -= 1
        }
        const oneMore = rand() < 0.5
        if(oneMore){
            if(s === 1){
                const x = r['x'] + offset 
                const y = r['y'] - 1
                g.carve(x, y)
                g.dirty(x, y)
                g.setVertDoor(x, y)
            } else if(s === 2){
                const x = r['x'] + r['w']
                const y = r['y'] + offset
                g.carve(x, y)
                g.dirty(x, y)
                g.setHorzDoor(x, y)
            } else if(s === 3){
                const x = r['x'] + offset
                const y = r['y'] + r['h']
                g.carve(x, y)
                g.dirty(x, y)
                g.setVertDoor(x, y)
            } else {
                const x = r['x'] - 1
                const y = r['y'] + offset
                g.carve(x, y)
                g.dirty(x, y)
                g.setHorzDoor(x, y)
            }
        }
        roomsLinked++
    }
    
    let trimmed = false

    let next = []

    function isDeadend(i){
        const uncarved_sides = []
        const carved_sides = []
        const x = g.colOf(i)
        const y = g.rowOf(i)
        if(!g.isCarved(x, y - 1)){
            uncarved_sides.push(1) 
        } else {
            carved_sides.push(g.getIdx(x, y - 1))
        }
        if(!g.isCarved(x + 1, y)){
            uncarved_sides.push(2)
        } else {
            carved_sides.push(g.getIdx(x + 1, y))
        }
        if(!g.isCarved(x, y + 1)){
            uncarved_sides.push(3)
        } else {
            carved_sides.push(g.getIdx(x, y + 1))
        }
        if(!g.isCarved(x - 1, y)){
            uncarved_sides.push(4)
        } else {
            carved_sides.push(g.getIdx(x - 1, y))
        }
        return uncarved_sides.length < 3 ? false : carved_sides[0]
    }

    function tryTrimming(){
        if(!trimmed){ 
            let oneTrimmed = false
            if(next.length < 1){
                // linear search for deadend
                g.arr.forEach((v, i) => {
                    const res = !g.isBorder(i) ? isDeadend(i) : null
                    if(res){
                        const x = g.colOf(i)
                        const y = g.rowOf(i)
                        g.setCell(x, y, g.FILLED)
                        g.dirty(x, y)
                        next.push(res)
                        oneTrimmed = true 
                    } 
                })
            } else {
                // process nexts
                // first validate them
                const tmp = []
                next.forEach((v, i) => {
                    const res = isDeadend(v)
                    if(res){
                        const x = g.colOf(v)
                        const y = g.rowOf(v)
                        g.setCell(x, y, g.FILLED)
                        g.dirty(x, y)
                        tmp.push(res)
                    }
                })
                oneTrimmed = true
                next = tmp
            }
            if(!oneTrimmed){
                trimmed = true 
            }
        }
    }

    const ROOMTRIES = 100
    let tries = 0

    render(() => {
        if(tries < ROOMTRIES){
            tryPlaceRoom()
            tries++
        } else if(crawlStack.length > 0){
            crawl()
        } else if(roomsLinked < roomRegistry.length){
            linkRoom()
        } else if(!trimmed){
            tryTrimming()
        }
        renderQueue.forEach(r=>{
        every(r, c => {
            if(g.isDirty(c.x(), c.y())){
                if(g.isCarved(c.x(), c.y())){
                    c.color = VERTEX
                    g.clean(c.x(), c.y())
                } else if(!g.isCarved(c.x(), c.y())){
                    c.color = FILLED
                    g.clean(c.x(), c.y())
                }
            }
        })})
    })

})

var renderQueue = []

// start the game
k.start("mapgen");

class Grid {
    /*
     * 0 - filled === 1, carved === 0
     * 1 - if horzDoor === 1, allowing horizontal passage
     * 2 - if vertDoor === 1, allowing vertical passage
     * 3 - undiscovered === 0, discovered === 1
     * 4 - if visited === 1
     * 5 - clean === 0, dirty === 1
     * 6 - if node === 1
     * 7 - if edge === 1
     */
    constructor(cols, rows){
        this.FILLED       = 0B00000001
        this.HORZDOOR     = 0B00000010
        this.VERTDOOR     = 0B00000100
        this.DISCOVERED   = 0B00001000
        this.VISITED      = 0B00010000
        this.CLEAN        = 0B00100000
        this.VERTEX       = 0B01000000
        this.EDGE         = 0B10000000
        if(rows % 2 === 0){
            rows += 1
        }
        if(cols % 2 === 0){
            cols += 1
        }
        this.width = cols
        this.height = rows
        this.arr = new Uint8Array((rows * cols))
        this.arr.fill((this.FILLED | this.CLEAN))
        for(let i = 0; i < this.arr.length; i++){
            const x = this.colOf(i)
            const y = this.rowOf(i)
            if(x % 2 === 0 && y % 2 === 0){
                this.setVertex(x, y)
            }
            if(!this.isBorder(x, y) && x % 2 === 0 && y % 2 === 1){
                this.setEdge(x, y)
            }
            if(!this.isBorder(x, y) && y % 2 === 0 && x % 2 === 1){
                this.setEdge(x, y)
            }
        }
    }
    getIdx(x, y){ // 
        if(x < 1){
            x = 1
        }
        if(y < 1){
            y = 1
        }
        return this.width * (y - 1) + x - 1
    }
    colOf(idx){ //
        return (idx % this.width) + 1
    }
    rowOf(idx){ //
        return Math.floor(idx / this.width) + 1
    }
    getCell(x, y, val){
        return this.arr[this.getIdx(x, y)] & val
    }
    setCell(x, y, val){
        this.arr[this.getIdx(x, y)] |= val
    }
    unsetCell(x, y, val){
        this.arr[this.getIdx(x, y)] &= ~val
    }
    isCarved(x, y){
        return this.getCell(x, y, this.FILLED) != this.FILLED
    }
    carve(x, y){
        this.unsetCell(x, y, this.FILLED)
    }
    isHorzDoor(x, y, val){
        return this.getCell(x, y, this.HORZDOOR) == this.HORZDOOR
    }
    setHorzDoor(x, y){
        this.setCell(x, y, this.HORZDOOR)
    }
    isVertDoor(x, y){
        return this.getCell(x, y, this.VERTDOOR) == this.VERTDOOR
    }
    setVertDoor(x, y){
        this.setCell(x, y, this.VERTDOOR)
    }
    isDiscovered(x, y){
        return this.getCell(x, y, this.DISCOVERED) == this.DISCOVERED
    }
    setDiscovered(x, y){
        this.setCell(x, y, this.DISCOVERED)
    }
    isVisited(x, y){
        return this.getCell(x, y, this.VISITED) == this.VISITED
    }
    setVisited(x, y){
        this.setCell(x, y, this.VISITED)
    }
    isDirty(x, y){
        return this.getCell(x, y, this.CLEAN) != this.CLEAN
    }
    dirty(x, y){
        this.unsetCell(x, y, this.CLEAN)
        renderQueue.push(`${x}-${y}`)
    }
    clean(x, y){
        this.setCell(x, y, this.CLEAN)
        const i = renderQueue.indexOf(`${x}-${y}`)
        renderQueue.splice(i, 1)
    }
    isVertex(x, y){
        return this.getCell(x, y, this.VERTEX) == this.VERTEX
    }
    setVertex(x, y){
        this.setCell(x, y, this.VERTEX)
    }
    isEdge(x, y){
        return this.getCell(x, y, this.EDGE) == this.EDGE
    }
    setEdge(x, y){
        this.setCell(x, y, this.EDGE)
    }
    isBorder(x, y){
        return x===1 || x ===this.width || y===1 || y===this.height
    }
}


