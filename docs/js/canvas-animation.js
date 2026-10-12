function Viewport() {
    var me = this;
    me.objects = [];
    var canvas = document.getElementById("drawing-surface");
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.onresize = function () {
        resizeCanvas();
    }
    var drawingSurface = document.getElementById("drawing-surface").getContext("2d");

    me.doPaint = true;
    function drawBackgroundImage() {
    if (me.backgroundImage) {
            drawingSurface.drawImage(me.backgroundImage, 0, 0, canvas.width, canvas.height);
        }
    }
    function drawObjects() {
        for (var i = 0; i < me.objects.length; i++) {
            me.objects[i].paint(drawingSurface);
        }
    }
    me.paintInit = function () {
        me.doPaint = true;
    }
    function paint() {
        me.paintInit();
        if (me.doPaint) {
            drawBackgroundImage();
            drawObjects();
            me.doPaint = false;
        }
    }
    var timer;
    me.init = function () {
        timer = setInterval(function () { paint(); }, 1000 / 30);
    };
    me.repaint = function () {
        me.doPaint = true;
    };
    me.addObject = function (obj) {
        me.objects.push(obj);
    }
}

function CloudParticle() {
    var me = this;
    me.opacity = 100;
    me.color = 'white';
    me.reset = function () {
        me.wind = RandomFloat(10)+5;
        me.speed = Random(4)-2 ;
        me.radius = 120;
        me.location = { x: 0, y: Random(window.innerHeight) };
    };
    me.reset();

    me.move = function () {
        if (me.location.x > window.innerWidth || me.location.x < 0 || me.location.y > window.innerHeight) {
            me.reset();
        }

        me.location.x += me.wind;
        me.location.y += me.speed;
    };
    me.paint = function (context) {
        me.move();
        context.beginPath();
        context.arc(me.location.x, me.location.y, me.radius, 0, 2 * Math.PI, false);
        context.fillStyle = me.color;
        context.globalAlpha = me.opacity / 255;
        context.fill();
        context.closePath();
    };
}
function Random(range) {
    return Math.floor((Math.random() * range) + 1);
}
function RandomFloat(range) {
    return (Math.random() * range) + 1;
}
var viewport = new Viewport();
for (var i = 0; i < 60; i++) {
    var cloud = new CloudParticle();
    viewport.addObject(cloud);
}
viewport.init();