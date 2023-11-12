export function getBrightness(color: string) {
    var r = parseInt(color.substr(1,2),16);
    var g = parseInt(color.substr(3,2),16);
    var b = parseInt(color.substr(5,2),16);
    return ((r*299)+(g*587)+(b*114))/1000;
}

export function adjustBrightness(hex: string, percent: number){
    var r = parseInt(hex.substr(1,2),16);
    var g = parseInt(hex.substr(3,2),16);
    var b = parseInt(hex.substr(5,2),16);
    r = Math.floor(r * (100 + percent) / 100);
    g = Math.floor(g * (100 + percent) / 100);
    b = Math.floor(b * (100 + percent) / 100);
    var newHex = "#" + r.toString(16) + g.toString(16) + b.toString(16);
    return newHex;
}