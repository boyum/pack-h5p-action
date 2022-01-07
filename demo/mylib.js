H5P.MyLib = (function ($) {
  /**
   * @class H5P.MyLib
   * @param {Object} params
   */
  function MyLib(params) {
    var $wrapper;

    this.attach = function ($container) {
      if ($wrapper === undefined) {
        $wrapper = $("<div/>", {
          html: "Hello " + params.name,
        });
      }

      $container.html("").addClass("h5p-mylib").append($wrapper);
    };
  }

  return MyLib;
})(H5P.jQuery);
