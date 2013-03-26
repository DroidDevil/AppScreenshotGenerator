$(function() {
    /*
    * Models Section
    */

	var Screenshot = Backbone.Model.extend({

        sync: function () {
            return false;
        },

        setFromFile: function(file) {
            var reader = new FileReader();
            var self = this;
            
            self.set({filename: file.name});

            reader.onload = (function(f) {
                return function(e) {
                    self.set({data: e.target.result});
                };
            })(file);
            reader.readAsDataURL(file);
        },

        setFromSrc: function(src) {
            this.set({ data: src, filename: "cid:"+this.cid });
        },

    });

    var Template = Backbone.Model.extend({

    });

    var Workspace = Backbone.Model.extend({

    });

    /*
    * Collections Section
    */

    var ScreenshotCollection = Backbone.Collection.extend({

        model: Screenshot,

    });
    var screenshots = new ScreenshotCollection;

    var TemplateCollection = Backbone.Collection.extend({

        model: Template,

    });
    var templates = new TemplateCollection;

    var WorkspaceCollection = Backbone.Collection.extend({

        model: Workspace,

    });
    var workspaceTemplates = new WorkspaceCollection;

    /*
    * Views Section
    */

    var ScreenshotView = Backbone.View.extend({

        tagName: "img",

        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);
            this.$el.draggable({ revert: "invalid", helper: "clone", opacity: 0.9, snap: ".workspace-template", snapMode: "inner" });
            this.$el.attr("data-id", this.model.cid);
            this.$el.width("5%");
        },

        render: function() {
            var data = this.model.get("data");
            if (!data) return this;

            var img = this.$el.get(0);
            img.src = data;
            return this;
        },

    });

    var TemplateView = Backbone.View.extend({

        tagName: "img",

        initialize: function() {
            this.$el.attr("src", this.model.get("url"));
            this.$el.width("10%");
            this.$el.addClass("template");

            this.$el.dblclick(_.bind(this.onDoubleClick, this));
        },

        onDoubleClick: function() {
            var workspace = new Workspace({ template: this.model });
            workspaceTemplates.add(workspace);
        },

    });

    var WorkspaceView = Backbone.View.extend({

        tagName: "canvas",

        initialize: function() {
            // Add shortcut to canvas
            this.canvas = this.$el;
            // Set up dropping on the canvas so that ScreenshowView can be dropped
            this.canvas.droppable({ drop: _.bind(this.onDrop, this) });
            this.canvas.addClass("workspace-template");

            // Save reference to the template in the incoming Workspace model
            this.template = this.model.get("template");

            // We already have the template url, so attach it
            this.imgTemplate = new Image;
            this.imgTemplate.onload = _.bind(this.onImgTemplateLoad, this);
            this.imgTemplate.src = this.template.get("url");

            // Prep the load callback for the screenshot
            this.imgScreenshot = new Image;
            this.imgScreenshot.onload = _.bind(this.onImgScreenshotLoad, this);

            // Listen for click events
            this.canvas.click(_.bind(this.onClick, this));
            this.canvas.dblclick(_.bind(this.onDblClick, this));

            // Remove this view if the model is removed
            this.listenTo(this.model, 'remove', this.remove);

            // Not rotated by default
            this.rotated = false;
        },

        onDrop: function(e, ui) {
            var el = ui.draggable;
            var id = el.attr("data-id");

            var screenshot = screenshots.get(id);
            if (screenshot) {
                this.imgScreenshot.src = screenshot.get("data");
            }
        },

        onImgTemplateLoad: function() {
            this.canvas.attr("width", this.imgTemplate.width);
            this.canvas.attr("height", this.imgTemplate.height);

            var ctx = this.canvas.get(0).getContext('2d');
            ctx.drawImage(this.imgTemplate, 0, 0);
        },

        onImgScreenshotLoad: function() {
            this.drawNormal();
        },

        onClick: function() {
            this.rotated = !this.rotated;
            this.drawNormal();
            // if (this.rotated) {
            //     this.drawNormal();
            // } else {
            //     this.drawRotated();
            // }
        },

        onDblClick: function() {
            this.model.destroy();
        },

        drawNormal: function() {
            var template = this.template;

            // Get the template draw dimensions
            var tw = this.template.get("w");
            var th = this.template.get("h");

            // Get image dimensions
            var imgW = this.imgScreenshot.width;
            var imgH = this.imgScreenshot.height;

            // Get and save the current state of the context
            var ctx = this.canvas.get(0).getContext('2d');
            ctx.save();

            // Setup the context
            this.setContextOrientation(ctx);
            
            // Correct draw dimensions for the right orientation
            var w = tw;
            var h = th;
            var correctOrientation = tw < th && imgW > imgH || tw > th && imgW < imgH;
            if (correctOrientation) {
                w = th;
                h = tw;
            }

            // Draw image and restore the context
            ctx.drawImage(this.imgScreenshot, 0, 0, w, h);
            ctx.restore();
        },

        setContextOrientation: function(ctx) {
            // Get template coordinates, dimensions, transformations
            var tx = this.template.get("x");
            var ty = this.template.get("y");
            var tw = this.template.get("w");
            var th = this.template.get("h");
            var trot = this.template.get("rot");

            var imgW = this.imgScreenshot.width;
            var imgH = this.imgScreenshot.height;

            // Should the orientation be corrected?
            var correctOrientation = tw < th && imgW > imgH || tw > th && imgW < imgH;

            if (this.rotated) {
                // Find center
                var centerX = tx + tw / 2;
                var centerY = ty + th / 2;

                // Move to center
                ctx.translate(centerX, centerY);

                // Correct orientation
                if (correctOrientation) {
                    ctx.rotate(-Math.PI / 2);
                    ctx.translate(-th / 2, -tw / 2); // Reverse width/height for orientation
                } else {
                    ctx.rotate(Math.PI);
                    ctx.translate(-tw / 2, -th / 2);
                }
            } else {
                // Correct orientation
                if (correctOrientation) {
                    ctx.translate(tx + tw, ty);
                    ctx.rotate( Math.PI / 2);
                } else {
                    ctx.translate(tx, ty);
                }
            }
        },

    });

    /*
    * Views attached to elements in the HTML
    */

    var ScreenshotListView = Backbone.View.extend({

        el: $("#screenshot-list"),

        initialize: function() {
            this.listenTo(screenshots, 'add', this.addOne);
        },

        addOne: function(screenshot) {
            var view = new ScreenshotView({model: screenshot});
            this.$el.append(view.render().el);
        },

    });

    var TemplateListView = Backbone.View.extend({

        el: $("#template-list"),

        initialize: function() {
            this.listenTo(templates, 'add', this.addOne);
        },

        addOne: function(template) {
            var view = new TemplateView({model: template});
            this.$el.append(view.render().el);
        },

    });

    var WorkspaceListView = Backbone.View.extend({

        el: $("#workspace"),

        initialize: function() {
            this.listenTo(workspaceTemplates, 'add', this.addOne);
        },

        addOne: function(workspace) {
            var view = new WorkspaceView({model: workspace});
            this.$el.append(view.render().el);
        },

    });

    // The view used to handle drops on drag-n-drop
    var DropboxView = Backbone.View.extend({

        el: $("#dropbox"),

        initialize: function() {
            $(document).on("dragenter", this.onDragEnter);
        },

        events: {
            "mouseover": "onMouseOver",
            "mouseout": "onMouseOut",
            "dragover": "onDragOver", // Hack! - without this some browsers will not prevent defaults on drop
            // "dragenter": "onDragEnter",
            "dragleave": "onDragLeave",
            "drop": "onDrop",
        },

        onMouseOver: function() {
            
        },

        onMouseOut: function() {
            this.clear();
        },

        onDragOver: function(e) {
            e.originalEvent.dataTransfer.dropEffect = "copy";
            e.preventDefault();
        },

        onDragEnter: function(e) {
            $("#dropbox").show();
        },

        onDragLeave: function() {
            this.clear();
        },

        onDrop: function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Tell the global dispatcher a file was dropped
            dispatcher.trigger("dropbox:fileDropped", e);
            this.clear();
        },

        clear: function() {
            this.$el.hide();
        },

    });

    var AppView = Backbone.View.extend({

        el: $("#app"),

        initialize: function() {
            // List for file drop events
            dispatcher.on("dropbox:fileDropped", this.fileDropped, this);
        },

        fileDropped: function(e) {
            var files = e.originalEvent.dataTransfer.files; // FileList object.

                for (var i=0, f; f=files[i]; i++) {
                    var screenshot = new Screenshot;
                    screenshot.setFromFile(f);
                    screenshots.add(screenshot);
                }
        },

        loadTemplates: function(data) {
            for (var i = 0; i < data.length; i++) {
                var template = new Template(data[i]);
                templates.add(template);
            };
        },

    });

    var templateData = [
        { url: "templates/android/galaxy-nexus.png", x: 150, y: 226, w: 503, h: 823 },
        { url: "templates/android/galaxy-note.png", x: 168, y: 206, w: 465, h: 848 },
        { url: "templates/android/nexus-s.png", x: 143, y: 241, w: 513, h: 784 },
        { url: "templates/android/nexus7.png", x: 159, y: 225, w: 482, h: 846 },
        { url: "templates/android/one-x.png", x: 181, y: 201, w: 434, h: 845 },
        { url: "templates/android/s3.png", x: 181, y: 202, w: 433, h: 844 },
        { url: "templates/android/tab2.png", x: 191, y: 190, w: 419, h: 877 },
        { url: "templates/android/xoom.png", x: 133, y: 150, w: 534, h: 965 },

        // { url: "templates/1.jpg", x: 80, y: 118, w: 98, h: 143, rot: -0.060 },
        // { url: "templates/2.jpg", x: 124, y: 57, w: 124, h: 182 },
        // { url: "templates/3.jpg", x: 121, y: 93, w: 128, h: 85 },
        // { url: "templates/4.jpg", x: 107, y: 91, w: 60, h: 98 },
        // { url: "templates/5.jpg" },
    ];

    var dispatcher = _.clone(Backbone.Events);

    var dropboxView = new DropboxView;
    dropboxView.render();

    var screenshotList = new ScreenshotListView;
    var templateList = new TemplateListView;
    var workspace = new WorkspaceListView;

    var app = new AppView;
    app.render();
    app.loadTemplates(templateData);

    var screenshot = new Screenshot;
    screenshot.setFromSrc("screen.png");
    screenshots.add(screenshot);

    var screenshot = new Screenshot;
    screenshot.setFromSrc("screen2.png");
    screenshots.add(screenshot);
});
