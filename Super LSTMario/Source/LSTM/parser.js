const RELEVANT_THINGS = ["Air", "Floor", "Block", "Brick", "Goomba", "Pipe", "Koopa", "Stone", "Flag", "CastleSmall", "Coin", "PipeHorizontal", "PipeVertical", "Piranha",
    "PlatformGeneratorUp", "PlatformGeneratorDown", "TreeTop", "TreeTrunk", "Platform", "PlatformTrack", "CastleLarge", "Water", "CastleBlock", "CastleBridge", "Bowser", "CastleAxe",
    "Springboard", "Coral", "Blooper", "CheepCheep", "BridgeBase", "Railing", "Podoboo", "HammerBro", "Lakitu", "Beetle", "ShroomTop", "ShroomTrunk", "Cannon", "PlantLarge",
    "Fence", "CastleWall", "Cloud1", "PlantSmall", "Cloud2"];

const RELEVANT_MACROS = ["Floor", "Pipe", "Fill", "Ceiling", "PlatformGenerator", "Tree", "Water", "StartInsideCastle",
    "EndInsideCastle", "EndOutsideCastle", "CastleSmall", "CastleLarge", "Scale", "Shroom", "Bridge"];

const CONTENTS = ["Mushroom", "Mushroom1Up", "Coin", "Star", "Vine", "HiddenCoin"];

let macros = {
    "Fill": macroFillPreThings,
    "Floor": macroFloor,
    "Pipe": macroPipe,
    "Tree": macroTree,
    "Shroom": macroShroom,
    "Water": macroWater,
    "CastleSmall": _coordsCastleSmall,
    "CastleLarge": _coordsCastleLarge,
    "Ceiling": macroCeiling,
    "Bridge": macroBridge,
    "Scale": _coordsScale,
    "PlatformGenerator": _coordsPlatformGenerator,
    // "CheepsStart": macroCheepsStart,
    // "CheepsStop": macroCheepsStop,
    // "BulletBillsStart": macroBulletBillsStart,
    // "BulletBillsStop": macroBulletBillsStop,
    // "LakituStop": macroLakituStop,
    "StartInsideCastle": macroStartInsideCastle,
    "EndOutsideCastle": _contentsEndOutsideCastle,
    "EndInsideCastle": _contentsEndInsideCastle,
}
let maps = FullScreenMario.FullScreenMario.settings.maps;
let properties = FullScreenMario.FullScreenMario.settings.objects.properties;
let propertiesFull = {};

areaGrids = [];

// parseObjectsFromMaps(maps.library);

parseRandomMaps(1);

function parseRandomMaps(count) {
    function getNewSeed() {
        return new Date().getTime()
            .toString()
            .split("")
            .sort(function () { return 0.5 - Math.random(); })
            .reverse()
            .join("");
    }

    // let randMaps = FullScreenMario.FullScreenMario.prototype.generateRandomMap(maps.library["Random"]);
}

function parseObjectsFromMaps(maps) {
    for (var mapID in maps) {
    
        for (var area in maps["areas"]) {
    
            let _area = maps["areas"][area];
            // Copy creation array
            let creation = [..._area["creation"]];
    
            // Filter out irrelevant data
            console.log(`Length prior to filtering: ${creation.length}`);
            creation = creation.filter(entry =>
                entry.macro && RELEVANT_MACROS.includes(entry.macro) ||
                entry.thing && RELEVANT_THINGS.includes(entry.thing));
            console.log(`Length after filtering: ${creation.length}`);
    
            let resultList = [];
            for (var reference of creation) {
    
                // console.log(reference);
                if (reference.macro && reference.macro != undefined) {
                    let result = macros[reference.macro](reference);
    
                    resultList.push(...result);
                }
                else {
    
                    if (reference.thing == "Platform" && reference.sliding) {
                        resultList.push(...macroSlidingPlatform(reference));
                    }
                    else resultList.push(reference);
                }
            }
    
            console.log(`Resulting list: ${resultList.length}`);
            // console.log(resultList);
    
            let lastXIndex = Math.max.apply(Math, resultList.map(function (o) { return o.x ?? 0; }));
    
            let gridArray = new Array(Math.ceil(lastXIndex / 8) + 1).fill(0).map(() => new Array(28).fill(0));
    
            for (var entry of resultList) {
                // if x or y are not given, pick 0 as default
                gridArray[Math.floor((entry.x || 0) / 8)][Math.floor((entry.y || 0) / 8)] = getThingID(entry);
            }
    
            printParsed((mapID == "Random" ? mapID + randCounter : mapID), area, gridArray);
        }

        randCounter++;
    }
}

//#region Utility

let randCounter = 0;
function printParsed(location, area, arr) {
    var textFile = null;


    var text = JSON.stringify(arr);
    var data = new Blob([text], { type: 'octet/stream' });

    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (textFile !== null) {
        window.URL.revokeObjectURL(textFile);
    }

    textFile = window.URL.createObjectURL(data);

    // returns a URL you can use as a href
    if(location == "Random")
        document.write(`<p><a href="${textFile}" download="${location}-${area}.json">${location}</a></p>`);
    else
        document.write(`<p><a href="${textFile}" download="${location}-${area}.json">${location}</a></p>`);
}

// function forceSaveData(location, area, data) {

//     var fileName = `${location}-${area}.json`;
//     var data = JSON.stringify(data);

//     saveJSON(fileName, data, );
// }

// function saveJSON (name, data) {

//     var a = document.createElement("a");
//     var url = window.URL.createObjectURL(new Blob([data], {type: "octlet/stream"}));
//     a.href= url;
//     a.download = name;
//     a.style = "display: none";
//     document.body.appendChild(a);
//     a.click();
//     window.URL.revokeObjectURL(url);
//     a.remove();
// }

function getThingID(entry) {
    switch (entry.thing) {

        case 'Block':
            // The X entries after relevant things is reserved for the different block types
            if (entry.contents) return RELEVANT_THINGS.length + CONTENTS.indexOf(entry.hidden ? "HiddenCoin" : entry.contents);

        case 'Brick':
            // The X entries after that are reserved for the different BRICK types
            if (entry.contents) return RELEVANT_THINGS.length + CONTENTS.length + CONTENTS.indexOf(entry.contents);

        default:
            return RELEVANT_THINGS.indexOf(entry.thing);
    }
}

function getIDThing(id) {

    if (id < RELEVANT_THINGS.length) return RELEVANT_THINGS[id];
    if (id < RELEVANT_THINGS.length + CONTENTS.length) return "Block" + CONTENTS[id - RELEVANT_THINGS.length];

    return "Brick" + CONTENTS[id - RELEVANT_THINGS.length - CONTENTS.length];
}

function printArray(arr) {

    let resultArr = new Array(arr[0].length).fill("").map(() => new Array(arr.length).fill(""));

    for (let x = 0; x < arr.length; x++) {

        for (let y = 0; y < arr[x].length; y++) {
            resultArr[arr[x].length - y - 1][x] = getIDThing(arr[x][y]);
        }
    }

    console.log(resultArr);
}

function listAllUniqueElements() {
    let _things = [];
    let _macros = [];
    for (var mapID in maps.library) {

        if (mapID == "Random") continue;
        for (var area of maps.library[mapID]["areas"]) {

            for (var reference of area["creation"]) {
                if (reference.thing && !_things.includes(reference.thing)) _things.push(reference.thing);
                if (reference.macro && !_macros.includes(reference.macro)) _macros.push(reference.macro);
            }
        }
    }

    console.log({ things: _things, macros: _macros });
}

function listUniqueThings(creation) {
    _things = [];
    _macros = [];

    for (var reference of creation) {
        if (reference.thing && !_things.includes(reference.thing)) _things.push(reference.thing);
        if (reference.macro && !_macros.includes(reference.macro)) _macros.push(reference.macro);
    }

    console.log({ things: _things, macros: _macros });
}

function proliferate(recipient, donor, noOverride) {
    if (noOverride === void 0) { noOverride = false; }
    var setting, i;
    // For each attribute of the donor:
    for (i in donor) {
        if (donor.hasOwnProperty(i)) {
            // If noOverride, don't override already existing properties
            if (noOverride && recipient.hasOwnProperty(i)) {
                continue;
            }
            // If it's an object, recurse on a new version of it
            setting = donor[i];
            if (typeof setting === "object") {
                if (!recipient.hasOwnProperty(i)) {
                    recipient[i] = new setting.constructor();
                }
                this.proliferate(recipient[i], setting, noOverride);
            }
            else {
                // Regular primitives are easy to copy otherwise
                recipient[i] = setting;
            }
        }
    }
    return recipient;
}
//#endregion

//#region Macros
// "Fill": FullScreenMario.FullScreenMario.prototype.macroFillPreThings,
function macroFillPreThings(reference) {

    var defaults = properties[reference.thing], xnum = reference.xnum || 1, ynum = reference.ynum || 1, xwidth = reference.xwidth || 8, yheight = reference.yheight || 8, x = reference.x || 0, yref = reference.y || 0, outputs = [], output, o = 0, y, i, j;
    for (i = 0; i < xnum; ++i) {
        y = yref;
        for (j = 0; j < ynum; ++j) {
            output = {
                "x": x,
                "y": y,
                "macro": undefined
            };
            outputs.push(proliferate(output, reference, true));
            o += 1;
            y += yheight;
        }
        x += xwidth;
    }
    return outputs;
}

// "Floor": FullScreenMario.FullScreenMario.prototype.macroFloor,
function macroFloor(reference) {

    var startX = reference.x || 0, y = reference.y || 0, width = reference.width || 8, outputs = [], output;

    for (var _x = startX; _x < startX + width; _x += 8) {
        output = proliferate({
            "thing": "Floor",
            "x": _x,
            "y": y,
            "width": 8,
            "height": "Infinity"
        }, reference, true);
        output.macro = undefined;

        outputs.push(output);
    }

    return outputs;

    // var x = reference.x || 0, y = reference.y || 0, floor = proliferate({
    //     "thing": "Floor",
    //     "x": x,
    //     "y": y,
    //     "width": (reference.width || 8),
    //     "height": "Infinity"
    // }, reference, true);
    // floor.macro = undefined;
    // return floor;
};
// "Pipe": FullScreenMario.FullScreenMario.prototype.macroPipe,
function macroPipe(reference, scope) {
    var x = reference.x || 0, y = reference.y || 0, height = reference.height || 16, pipe = proliferate({
        "thing": "Pipe",
        "x": x,
        "y": y,
        "width": 16,
        "height": reference.height === Infinity
            ? "Infinity"
            : reference.height || 8
    }, reference, true), output = [pipe];
    pipe.macro = undefined;
    if (height === "Infinity" || height === Infinity) {
        pipe.height = 99;
    }
    else {
        pipe.y += height;
    }
    if (reference.piranha) {
        output.push({
            "thing": "Piranha",
            "x": x + 4,
            "y": pipe.y + 12,
            "onPipe": true
        });
    }
    return output;
};

// "Tree": FullScreenMario.FullScreenMario.prototype.macroTree,
function macroTree(reference, scope) {
    var x = reference.x || 0, y = reference.y || 0, width = reference.width || 24, output = [
        {
            "thing": "TreeTop",
            "x": x,
            "y": y,
            "width": width
        }
    ];
    if (width > 16) {
        output.push({
            "thing": "TreeTrunk",
            "x": x + 8,
            "y": y - 8,
            "width": width - 16,
            "height": "Infinity",
            "groupType": reference.solidTrunk ? "Solid" : "Scenery"
        });
    }
    return output;
};
// "Shroom": FullScreenMario.FullScreenMario.prototype.macroShroom,
function macroShroom(reference, scope) {
    var x = reference.x || 0, y = reference.y || 0, width = reference.width || 24, output = [
        {
            "thing": "ShroomTop",
            "x": x,
            "y": y,
            "width": width
        }
    ];
    if (width > 16) {
        output.push({
            "thing": "ShroomTrunk",
            "x": x + (width - 8) / 2,
            "y": y - 8,
            "height": Infinity,
            "groupType": reference.solidTrunk ? "Solid" : "Scenery"
        });
    }
    return output;
};
// "Water": FullScreenMario.FullScreenMario.prototype.macroWater,
function macroWater(reference) {
    return [proliferate({
        "thing": "Water",
        "x": reference.x || 0,
        "y": (reference.y || 0) + 2,
        "height": "Infinity",
        "macro": undefined
    }, reference, true)];
};
// "Ceiling": FullScreenMario.FullScreenMario.prototype.macroCeiling,
function macroCeiling(reference) {
    return macros["Fill"]({
        "thing": "Brick",
        "x": reference.x,
        "y": 88,
        "xnum": (reference.width / 8) | 0,
        "xwidth": 8
    });
};
// "CastleSmall": FullScreenMario.FullScreenMario.prototype.macroCastleSmall,
function macroCastleSmall(reference) {
    var output = [], x = reference.x || 0, y = reference.y || 0, i, j;
    // Base filling left
    for (i = 0; i < 2; i += 1) {
        output.push({
            "thing": "BrickHalf",
            "x": x + i * 8,
            "y": y + 4,
            "position": "end"
        });
        for (j = 1; j < 3; j += 1) {
            output.push({
                "thing": "BrickPlain",
                "x": x + i * 8,
                "y": y + 4 + j * 8,
                "position": "end"
            });
        }
    }
    // Base filling right
    for (i = 0; i < 2; i += 1) {
        output.push({
            "thing": "BrickHalf",
            "x": x + 24 + i * 8,
            "y": y + 4,
            "position": "end"
        });
        for (j = 1; j < 3; j += 1) {
            output.push({
                "thing": "BrickPlain",
                "x": x + 24 + i * 8,
                "y": y + 4 + j * 8,
                "position": "end"
            });
        }
    }
    // Medium railing left
    output.push({
        "thing": "CastleRailing",
        "x": x,
        "y": y + 24,
        "position": "end"
    });
    // Medium railing center
    for (i = 0; i < 3; i += 1) {
        output.push({
            "thing": "CastleRailingFilled",
            "x": x + (i + 1) * 8,
            "y": y + 24,
            "position": "end"
        });
    }
    // Medium railing right
    output.push({
        "thing": "CastleRailing",
        "x": x + 32,
        "y": y + 24,
        "position": "end"
    });
    // Top railing
    for (i = 0; i < 3; i += 1) {
        output.push({
            "thing": "CastleRailing",
            "x": x + (i + 1) * 8,
            "y": y + 40,
            "position": "end"
        });
    }
    // Top bricking
    for (i = 0; i < 2; i += 1) {
        output.push({
            "thing": "CastleTop",
            "x": x + 8 + i * 12,
            "y": y + 36,
            "position": "end"
        });
    }
    // Door, and detector if required
    output.push({
        "thing": "CastleDoor",
        "x": x + 16,
        "y": y + 20,
        "position": "end"
    });
    if (reference.transport) {
        output.push({
            "thing": "DetectCollision",
            "x": x + 24,
            "y": y + 16,
            "height": 16,
            "activate": FSM.collideCastleDoor,
            "transport": reference.transport,
            "position": "end"
        });
    }
    return output;
};

function _coordsCastleSmall(reference) {
    var x = reference.x || 0, y = reference.y || 0;

    return [{
        "thing": "CastleSmall",
        "x": x + 16,
        "y": y + 20,
        "position": "end"
    }];
}

// "CastleLarge": FullScreenMario.FullScreenMario.prototype.macroCastleLarge,
function macroCastleLarge(reference) {
    var output = [], x = reference.x || 0, y = reference.y || 0, i, j;
    output.push(...macros["CastleSmall"]({
        "x": x + 16,
        "y": y + 48
    }));
    // CastleWalls left
    for (i = 0; i < 2; i += 1) {
        output.push({
            "thing": "CastleWall",
            "x": x + i * 8,
            "y": y + 48
        });
    }
    // Bottom doors with bricks on top
    for (i = 0; i < 3; i += 1) {
        output.push({
            "thing": "CastleDoor",
            "x": x + 16 + i * 16,
            "y": y + 20,
            "position": "end"
        });
        for (j = 0; j < 2; j += 1) {
            output.push({
                "thing": "BrickPlain",
                "x": x + 16 + i * 16,
                "y": y + 28 + j * 8
            });
            output.push({
                "thing": "BrickHalf",
                "x": x + 16 + i * 16,
                "y": y + 40 + j * 4
            });
        }
    }
    // Bottom bricks with doors on top
    for (i = 0; i < 2; i += 1) {
        for (j = 0; j < 3; j += 1) {
            output.push({
                "thing": "BrickPlain",
                "x": x + 24 + i * 16,
                "y": y + 8 + j * 8
            });
        }
        output.push({
            "thing": "CastleDoor",
            "x": x + 24 + i * 16,
            "y": y + 44
        });
    }
    // Railing (filled)
    for (i = 0; i < 5; i += 1) {
        output.push({
            "thing": "CastleRailingFilled",
            "x": x + 16 + i * 8,
            "y": y + 48
        });
    }
    // CastleWalls right
    j = reference.hasOwnProperty("walls") ? reference.walls : 2;
    for (i = 0; i < j; i += 1) {
        output.push({
            "thing": "CastleWall",
            "x": x + 56 + i * 8,
            "y": y + 48,
            "position": "end"
        });
    }
    if (reference.transport) {
        output.push({
            "thing": "DetectCollision",
            "x": x + 24,
            "y": y + 16,
            "height": 16,
            "activate": collideCastleDoor,
            "transport": reference.transport,
            "position": "end"
        });
    }
    return output;
};

function _coordsCastleLarge(reference) {
    var x = reference.x || 0, y = reference.y || 0;

    return [
        ...macros["CastleSmall"]({
            "x": x + 16,
            "y": y + 48
        }),
        {
            "thing": "CastleLarge",
            "x": x + 16,
            "y": y,
            "position": "end"
        }];
}
// "Bridge": FullScreenMario.FullScreenMario.prototype.macroBridge,
function macroBridge(reference) {
    var x = reference.x || 0, y = reference.y || 0, width = Math.max(reference.width || 0, 16), output = [];
    // A beginning column reduces the width and pushes it forward
    if (reference.begin) {
        width -= 8;
        output.push({
            "thing": "Stone",
            "x": x,
            "y": y,
            "height": "Infinity"
        });
        x += 8;
    }
    // An ending column just reduces the width 
    if (reference.end) {
        width -= 8;
        output.push({
            "thing": "Stone",
            "x": x + width,
            "y": y,
            "height": "Infinity"
        });
    }
    // Between any columns is a BridgeBase with a Railing on top
    output.push({ "thing": "BridgeBase", "x": x, "y": y, "width": width });
    output.push({ "thing": "Railing", "x": x, "y": y + 4, "width": width });
    return output;
};
// "Scale": FullScreenMario.FullScreenMario.prototype.macroScale,
function macroScale(reference) {
    var x = reference.x || 0, y = reference.y || 0, unitsize = 8, widthLeft = reference.widthLeft || 24, widthRight = reference.widthRight || 24, between = reference.between || 40, dropLeft = reference.dropLeft || 24, dropRight = reference.dropRight || 24, collectionName = "ScaleCollection--" + [
        x, y, widthLeft, widthRight, dropLeft, dropRight
    ].join(",");
    return [
        {
            "thing": "String",
            "x": x,
            "y": y - 4,
            "height": dropLeft - 4,
            "collectionName": collectionName,
            "collectionKey": "stringLeft"
        },
        {
            "thing": "String",
            "x": x + between,
            "y": y - 4,
            "height": dropRight - 4,
            "collectionName": collectionName,
            "collectionKey": "stringRight"
        }, {
            "thing": "String",
            "x": x + 4,
            "y": y,
            "width": between - 7,
            "collectionName": collectionName,
            "collectionKey": "stringMiddle"
        }, {
            "thing": "StringCornerLeft",
            "x": x,
            "y": y
        }, {
            "thing": "StringCornerRight",
            "x": x + between - 4,
            "y": y
        }, {
            "thing": "Platform",
            "x": x - (widthLeft / 2),
            "y": y - dropLeft,
            "width": widthLeft,
            "inScale": true,
            "tension": (dropLeft - 1.5) * unitsize,
            "onThingAdd": FSM.spawnScalePlatform,
            "collectionName": collectionName,
            "collectionKey": "platformLeft"
        }, {
            "thing": "Platform",
            "x": x + between - (widthRight / 2),
            "y": y - dropRight,
            "width": widthRight,
            "inScale": true,
            "tension": (dropRight - 1.5) * unitsize,
            "onThingAdd": FSM.spawnScalePlatform,
            "collectionName": collectionName,
            "collectionKey": "platformRight"
        }];
};

function _coordsScale(reference) {
    var x = reference.x || 0, y = reference.y || 0, unitsize = 8, widthLeft = reference.widthLeft || 24, widthRight = reference.widthRight || 24, between = reference.between || 40, dropLeft = reference.dropLeft || 24, dropRight = reference.dropRight || 24, collectionName = "ScaleCollection--" + [
        x, y, widthLeft, widthRight, dropLeft, dropRight
    ].join(",");
    return [
        {
            "thing": "Platform",
            "x": x + between - (widthRight / 2),
            "y": y - dropRight,
            "width": widthRight,
            "inScale": true,
            "tension": (dropRight - 1.5) * unitsize,
            // "onThingAdd": FSM.spawnScalePlatform,
            "collectionName": collectionName,
            "collectionKey": "platformRight"
        }];
}

// "PlatformGenerator": FullScreenMario.FullScreenMario.prototype.macroPlatformGenerator,
function macroPlatformGenerator(reference) {
    var output = [], direction = reference.direction || 1, levels = direction > 0 ? [0, 48] : [8, 56], width = reference.width || 16, x = reference.x || 0, yvel = direction * FSM.unitsize * .42, i;
    for (i = 0; i < levels.length; i += 1) {
        output.push({
            "thing": "Platform",
            "x": x,
            "y": levels[i],
            "width": width,
            "yvel": yvel,
            "movement": FSM.movePlatformSpawn
        });
    }
    output.push({
        "thing": "PlatformString",
        "x": x + (width / 2) - .5,
        "y": FSM.MapScreener.floor,
        "width": 1,
        "height": FSM.MapScreener.height / FSM.unitsize
    });
    return output;
};

function _coordsPlatformGenerator(reference) {
    var direction = reference.direction || 1, x = reference.x || 0, width = reference.width || 24;
    return [{
        "thing": (direction == 1 ? "PlatformGeneratorUp" : "PlatformGeneratorDown"),
        "x": x + width / 2,
        "y": 0
    }]
}

function macroSlidingPlatform(reference) {
    var x = reference.x || 0, y = reference.y || 0, width = reference.width || 16, begin = reference.begin, end = reference.end, outputs = [], output;

    for (let _x = begin; _x < end; _x += 8) {
        output = {
            "thing": "PlatformTrack",
            "x": _x,
            "y": y
        }

        outputs.push(output);
    }

    for (let _i = 0; _i < width; _i += 8) {
        output = {
            "thing": "Platform",
            "x": x + _i,
            "y": y
        }

        outputs.push(output);
    }

    return outputs;
}

// "StartInsideCastle": FullScreenMario.FullScreenMario.prototype.macroStartInsideCastle,
function macroStartInsideCastle(reference) {
    var x = reference.x || 0, y = reference.y || 0, width = (reference.width || 0) - 40, output = [
        {
            "thing": "Stone",
            "x": x,
            "y": y + 48,
            "width": 24,
            "height": Infinity
        },
        {
            "thing": "Stone",
            "x": x + 24,
            "y": y + 40,
            "width": 8,
            "height": Infinity
        },
        {
            "thing": "Stone",
            "x": x + 32,
            "y": y + 32,
            "width": 8,
            "height": Infinity
        }];
    if (width > 0) {
        output.push(...macros["Floor"]({
            "x": x + 40,
            "y": y + 24,
            "width": width
        }));
    }
    return output;
};

// "EndOutsideCastle": FullScreenMario.FullScreenMario.prototype.macroEndOutsideCastle,
function macroEndOutsideCastle(reference) {
    var x = reference.x || 0, y = reference.y || 0, collectionName = "EndOutsideCastle-" + [
        reference.x, reference.y, reference.large
    ].join(","), output;
    // Output starts off with the general flag & collision detection
    output = [
        // Initial collision detector
        {
            "thing": "DetectCollision", x: x, y: y + 108, height: 100,
            "activate": collideFlagpole,
            "activateFail": FullScreenMario.prototype.killNormal,
            "noActivateDeath": true,
            "collectionName": collectionName,
            "collectionKey": "DetectCollision"
        },
        // Flag (scenery)
        {
            "thing": "Flag",
            "x": x,
            "y": y + 8,
        }];
    if (reference.large) {
        output.push(...macros["CastleLarge"]({
            "x": x + (reference.castleDistance || 24),
            "y": y,
            "transport": reference.transport,
            "walls": reference.walls || 8
        }));
    }
    else {
        output.push(...macros["CastleSmall"]({
            "x": x + (reference.castleDistance || 32),
            "y": y,
            "transport": reference.transport
        }));
    }
    return output;
};

function _contentsEndOutsideCastle(reference) {
    var x = reference.x || 0, y = reference.y || 0, collectionName = "EndOutsideCastle-" + [
        reference.x, reference.y, reference.large].join(",");

    output = [
        // // Flag (scenery)
        // {
        //     "thing": "Flag", "x": x, "y": y + 80,
        //     "collectionName": collectionName,
        //     "collectionKey": "Flag"
        // },
        // {
        //     "thing": "FlagTop", "x": x, "y": y + 88,
        //     "collectionName": collectionName,
        //     "collectionKey": "FlagTop"
        // },
        // // Bottom stone
        {
            "thing": "Flag",
            "x": x,
            "y": y + 8,
        }];

    // for (var _y = y + 8; _y < y + 80; _y += 8)

    //     output.push({
    //         "thing": "FlagPole", "x": x, "y": _y,
    //         "collectionName": collectionName,
    //         "collectionKey": "FlagPole"
    //     });

    if (reference.large) {
        output.push(...macros["CastleLarge"]({
            "x": x + (reference.castleDistance || 24),
            "y": y,
            "transport": reference.transport,
            "walls": reference.walls || 8
        }));
    }
    else {
        output.push(...macros["CastleSmall"]({
            "x": x + (reference.castleDistance || 32),
            "y": y,
            "transport": reference.transport
        }));
    }
    return output;
}

// "EndInsideCastle": FullScreenMario.FullScreenMario.prototype.macroEndInsideCastle,
function macroEndInsideCastle(reference) {
    var x = reference.x || 0, y = reference.y || 0, npc = reference.npc || "Toad", output, texts, keys;
    if (npc === "Toad") {
        keys = ["1", "2"];
        texts = [
            {
                "thing": "CustomText",
                "x": x + 164,
                "y": y + 64,
                "texts": [{
                    "text": "THANK YOU MARIO!"
                }],
                "textAttributes": {
                    "hidden": true
                },
                "collectionName": "endInsideCastleText",
                "collectionKey": "1"
            }, {
                "thing": "CustomText",
                "x": x + 152,
                "y": y + 48,
                "texts": [
                    {
                        "text": "BUT OUR PRINCESS IS IN"
                    }, {
                        "text": "ANOTHER CASTLE!"
                    }],
                "textAttributes": {
                    "hidden": true
                },
                "collectionName": "endInsideCastleText",
                "collectionKey": "2"
            }];
    }
    else if (npc === "Peach") {
        keys = ["1", "2", "3"];
        texts = [
            {
                "thing": "CustomText",
                "x": x + 164,
                "y": y + 64,
                "texts": [{
                    "text": "THANK YOU MARIO!"
                }],
                "textAttributes": {
                    "hidden": true
                },
                "collectionName": "endInsideCastleText",
                "collectionKey": "1"
            }, {
                "thing": "CustomText",
                "x": x + 152,
                "y": y + 48,
                "texts": [
                    {
                        "text": "YOUR QUEST IS OVER.",
                        "offset": 12
                    }, {
                        "text": "WE PRESENT YOU A NEW QUEST."
                    }],
                "textAttributes": {
                    "hidden": true
                },
                "collectionName": "endInsideCastleText",
                "collectionKey": "2"
            }, {
                "thing": "CustomText",
                "x": x + 152,
                "y": 32,
                "texts": [
                    {
                        "text": "PRESS BUTTON B",
                        "offset": 8
                    }, {
                        "text": "TO SELECT A WORLD"
                    }],
                "textAttributes": {
                    "hidden": true
                },
                "collectionName": "endInsideCastleText",
                "collectionKey": "3"
            }];
    }
    output = [
        { "thing": "Stone", "x": x, "y": y + 88, "width": 256 },
        ...macros["Water"]({ "x": x, "y": y, "width": 104 }),
        // Bridge & Bowser area
        { "thing": "CastleBridge", "x": x, "y": y + 24, "width": 104 },
        {
            "thing": "Bowser", "x": x + 69, "y": y + 42,
            "hard": reference.hard,
            "spawnType": reference.spawnType || "Goomba",
            "throwing": reference.throwing
        },
        { "thing": "CastleChain", "x": x + 96, "y": y + 32 },
        // Axe area
        { "thing": "CastleAxe", "x": x + 104, "y": y + 40 },
        // { "thing": "ScrollBlocker", "x": x + 112 },
        ...macros["Floor"]({ "x": x + 104, "y": y, "width": 152 }),
        {
            "thing": "Stone", "x": x + 104, "y": y + 32,
            "width": 24, "height": 32
        },
        {
            "thing": "Stone", "x": x + 112, "y": y + 80,
            "width": 16, "height": 24
        },
        // Peach's Magical Happy Chamber of Fantastic Love
        {
            "thing": "DetectCollision", "x": x + 180,
            "activate": FSM.collideCastleNPC,
            "transport": reference.transport,
            "collectionName": "endInsideCastleText",
            "collectionKey": "npc",
            "collectionKeys": keys
        },
        { "thing": npc, "x": x + 200, "y": 13 },
        // { "thing": "ScrollBlocker", "x": x + 256 }
    ];
    if (reference.topScrollEnabler) {
        output.push({
            "thing": "ScrollEnabler",
            "x": x + 96, "y": y + 140,
            "height": 52, "width": 16
        });
        output.push({
            "thing": "ScrollEnabler",
            "x": x + 240, "y": y + 140,
            "height": 52, "width": 16
        });
    }
    output.push.apply(output, texts);
    return output;
};

function _contentsEndInsideCastle(reference) {
    var x = reference.x || 0, y = reference.y || 0, npc = reference.npc || "Toad";

    return [
        { "thing": "Stone", "x": x, "y": y + 88, "width": 256 },
        ...macros["Water"]({ "x": x, "y": y, "width": 104 }),
        // Bridge & Bowser area
        { "thing": "CastleBridge", "x": x, "y": y + 24, "width": 104 },
        {
            "thing": "Bowser", "x": x + 69, "y": y + 42,
            "hard": reference.hard,
            "spawnType": reference.spawnType || "Goomba",
            "throwing": reference.throwing
        },
        { "thing": "CastleChain", "x": x + 96, "y": y + 32 },
        // Axe area
        { "thing": "CastleAxe", "x": x + 104, "y": y + 40 },
        // { "thing": "ScrollBlocker", "x": x + 112 },
        ...macros["Floor"]({ "x": x + 104, "y": y, "width": 152 }),
        {
            "thing": "Stone", "x": x + 104, "y": y + 32,
            "width": 24, "height": 32
        },
        {
            "thing": "Stone", "x": x + 112, "y": y + 80,
            "width": 16, "height": 24
        },
        // Peach's Magical Happy Chamber of Fantastic Love
        // { "thing": npc, "x": x + 200, "y": 13 }
    ];
}

// "CheepsStart": FullScreenMario.FullScreenMario.prototype.macroCheepsStart,
function macroCheepsStart(reference) {
    return {
        "thing": "DetectCollision",
        "x": reference.x || 0,
        "y": FSM.MapScreener.floor,
        "width": reference.width || 8,
        "height": FSM.MapScreener.height / FSM.unitsize,
        "activate": FSM.activateCheepsStart
    };
};

// "CheepsStop": FullScreenMario.FullScreenMario.prototype.macroCheepsStop,
function macroCheepsStop(reference) {
    return {
        "thing": "DetectCollision",
        "x": reference.x || 0,
        "y": FSM.MapScreener.floor,
        "width": reference.width || 8,
        "height": FSM.MapScreener.height / FSM.unitsize,
        "activate": FSM.activateCheepsStop
    };
};
// "BulletBillsStart": FullScreenMario.FullScreenMario.prototype.macroBulletBillsStart,
function macroBulletBillsStart(reference) {
    return {
        "thing": "DetectCollision",
        "x": reference.x || 0,
        "y": FSM.MapScreener.floor,
        "width": reference.width || 8,
        "height": FSM.MapScreener.height / FSM.unitsize,
        "activate": FSM.activateBulletBillsStart
    };
};
// "BulletBillsStop": FullScreenMario.FullScreenMario.prototype.macroBulletBillsStop,
function macroBulletBillsStop(reference) {
    return {
        "thing": "DetectCollision",
        "x": reference.x || 0,
        "y": FSM.MapScreener.floor,
        "width": reference.width || 8,
        "height": FSM.MapScreener.height / FSM.unitsize,
        "activate": FSM.activateBulletBillsStop
    };
};
// "LakituStop": FullScreenMario.FullScreenMario.prototype.macroLakituStop,
function macroLakituStop(reference) {
    return {
        "thing": "DetectCollision",
        "x": reference.x || 0,
        "y": FSM.MapScreener.floor,
        "width": reference.width || 8,
        "height": FSM.MapScreener.height / FSM.unitsize,
        "activate": FSM.activateLakituStop
    };
};
//#endregion

