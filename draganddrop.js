/**
 * Project: Angular-DragDrop
 * Author: Ganaraj.Pr
 * Contributors: LiamKarlMitchell
 * GitHub: http://ganarajpr.github.io/angular-dragdrop
 * LastModified: Monday May 26 2014 15:31:21 GMT+1200 (NZST)
 */
angular.module("ngDragDrop",[])
    .directive("uiDraggable", [
        '$parse',
        '$rootScope',
        function ($parse, $rootScope) {
            return function (scope, element, attrs) {
                if (window.jQuery && !window.jQuery.event.props.dataTransfer) {
                    window.jQuery.event.props.push('dataTransfer');
                }
                element.attr("draggable", false);
                attrs.$observe("uiDraggable", function (newValue) {
                    element.attr("draggable", newValue);
                });
                var dragData = "";
                scope.$watch(attrs.drag, function (newValue) {
                    dragData = newValue;
                });
                element.bind("dragstart", function (e) {
                    var sendData = "";
                    $rootScope.$root.draganddrop_data = dragData;
                    if (dragData) {
                        sendData = angular.toJson(dragData);
                    }
                    var sendChannel = attrs.dragChannel || "defaultchannel";
                    var dragImage = attrs.dragImage || null;
                    if (dragImage) {
                        var dragImageFn = $parse(attrs.dragImage);
                        scope.$apply(function() {
                            var dragImageParameters = dragImageFn(scope, {$event: e});
                            if (dragImageParameters && dragImageParameters.image) {
                                var xOffset = dragImageParameters.xOffset || 0,
                                    yOffset = dragImageParameters.yOffset || 0;
                                e.dataTransfer.setDragImage(dragImageParameters.image, xOffset, yOffset);
                            }
                        });
                    }

                    e.dataTransfer.setData("Text", sendData);
                    $rootScope.$root.draganddrop_exp = attrs.drag;
                    $rootScope.$root.draganddrop_scope = scope;
                    $rootScope.$broadcast("ANGULAR_DRAG_START", sendChannel);
                });

                element.bind("dragend", function (e) {
                    var sendChannel = attrs.dragChannel || "defaultchannel";
                    $rootScope.$broadcast("ANGULAR_DRAG_END", sendChannel);
                    if (e.dataTransfer && e.dataTransfer.dropEffect !== "none") {
                        if (attrs.onDropSuccess) {
                            var fn = $parse(attrs.onDropSuccess);
                            scope.$apply(function () {
                                fn(scope, {$event: e, $droppedScope: $rootScope.$root.draganddrop_dropscope});
                            });
                        }
                    }

                    delete $rootScope.$root.draganddrop_scope;
                    delete $rootScope.$root.draganddrop_data;
                    delete $rootScope.$root.draganddrop_dropscope;
                });


            };
        }
    ])
    .directive("uiOnDrop", [
        '$parse',
        '$rootScope',
        function ($parse, $rootScope) {
            return function (scope, element, attr) {
                var dragging = 0; //Ref. http://stackoverflow.com/a/10906204
                var dropChannel = "defaultchannel";
                var dragChannel = "";
                var dragEnterClass = attr.dragEnterClass || "on-drag-enter";
                var dragHoverClass = attr.dragHoverClass || "on-drag-hover";

                function onDragOver(e) {

                    if (e.preventDefault) {
                        e.preventDefault(); // Necessary. Allows us to drop.
                    }

                    if (e.stopPropagation) {
                        e.stopPropagation();
                    }
                    e.dataTransfer.dropEffect = 'move';

                    var result = _processDropEvent(e,'uiCanDrop');

                    // If the result from canDrop was a true or false we want to allow or deny dropping.
                    // If it was undefined or null then no action is done.
                    // The uiCanDrop function could set e.dataTransfer.dropEffect = 'some value it wants' and return nothing.
                    if (result == true) {
                        e.dataTransfer.dropEffect = 'all';
                    } else if (result == false) {
                        e.dataTransfer.dropEffect = 'none';
                    }

                    return false;
                }

                function onDragLeave(e) {
                    dragging--;
                    if (dragging == 0) {
                        element.removeClass(dragHoverClass);
                    }

                    e.dataTransfer.dropEffect = 'all';
                }

                function onDragEnter(e) {
                    dragging++;
                    $rootScope.$broadcast("ANGULAR_HOVER", dropChannel);
                    element.addClass(dragHoverClass);

                    var result = _processDropEvent(e,'uiCanDrop');

                    // If the result from canDrop was a true or false we want to allow or deny dropping.
                    // If it was undefined or null then no action is done.
                    // The uiCanDrop function could set e.dataTransfer.dropEffect = 'some value it wants' and return nothing.
                    if (result == true) {
                        e.dataTransfer.dropEffect = 'all';
                    } else if (result == false) {
                        e.dataTransfer.dropEffect = 'none';
                    }

                }

                // Yes I could get functionName from e.type in a switch case but
                // I think its better to pass it in directly as I am not sure about cross browser if all things use same event names. (IE...)
                function _processDropEvent(e, functionName) {
                    var data = $rootScope.$root.draganddrop_data;
                    var fn = $parse(attr[functionName]);
                    var result = scope.$apply(function () {
                        return fn(scope, {$data: data, $event: e, $draggedScope: $rootScope.$root.draganddrop_scope});
                    });

                    return result;
                }

                function onDrop(e) {
                    if (e.preventDefault) {
                        e.preventDefault(); // Necessary. Allows us to drop.
                    }
                    if (e.stopPropagation) {
                        e.stopPropagation(); // Necessary. Allows us to drop.
                    }
                    _processDropEvent(e,'uiOnDrop');
                    element.removeClass(dragEnterClass);

                    $rootScope.$root.draganddrop_dropscope = scope;
                }


                $rootScope.$on("ANGULAR_DRAG_START", function (event, channel) {
                    dragChannel = channel;
                    if (dropChannel === channel) {

                        element.bind("dragover", onDragOver);
                        element.bind("dragenter", onDragEnter);
                        element.bind("dragleave", onDragLeave);

                        element.bind("drop", onDrop);
                        element.addClass(dragEnterClass);
                    }

                });



                $rootScope.$on("ANGULAR_DRAG_END", function (e, channel) {
                    dragChannel = "";
                    if (dropChannel === channel) {

                        element.unbind("dragover", onDragOver);
                        element.unbind("dragenter", onDragEnter);
                        element.unbind("dragleave", onDragLeave);

                        element.unbind("drop", onDrop);
                        element.removeClass(dragHoverClass);
                        element.removeClass(dragEnterClass);
                    }
                });


                $rootScope.$on("ANGULAR_HOVER", function (e, channel) {
                    if (dropChannel === channel) {
                      element.removeClass(dragHoverClass);
                    }
                });


                attr.$observe('dropChannel', function (value) {
                    if (value) {
                        dropChannel = value;
                    }
                });


            };
        }
    ]);
