

// va en header
    // <link rel="stylesheet" href="./bootstrap/bootstrap-paginator-master/css/qunit-1.11.0.css">
    // <link rel="stylesheet" href="./bootstrap/bootstrap-paginator-master/css/bootstrapv3.css">
    // <script src="./bootstrap/bootstrap-paginator-master/lib/jquery-1.9.1.min.js" type="text/javascript"></script>
    // <script src="./bootstrap/bootstrap-paginator-master/lib/bootstrapv3.js" type="text/javascript"></script>


    // se queda pegado el tooltip
    $(function(){
            var element = $('#btnsPaginator');
            var options = {
                bootstrapMajorVersion:3,
                currentPage: 3,
                numberOfPages: 5,
                totalPages:100,
                itemContainerClass: function (type, page, current) {
                    return (page === current) ? "active" : "pointer-cursor";
                },
                useBootstrapTooltip:true,
                tooltipTitles: function (type, page, current) {
                    switch (type) {
                    case "first":
                        return "Go To First Page <i class='icon-fast-backward icon-white'></i>";
                    case "prev":
                        return "Go To Previous Page <i class='icon-backward icon-white'></i>";
                    case "next":
                        return "Go To Next Page <i class='icon-forward icon-white'></i>";
                    case "last":
                        return "Go To Last Page <i class='icon-fast-forward icon-white'></i>";
                    case "page":
                        return "Go to page " + page + " <i class='icon-file icon-white'></i>";
                    }
                },
                bootstrapTooltipOptions: {
                    html: true,
                    placement: 'bottom'
                }
            }
            element.bootstrapPaginator(options);
    });

// al final
{/* <script src="./bootstrap/bootstrap-paginator-master/src/bootstrap-paginator.js"></script>
<script src="./bootstrap/bootstrap-paginator-master/lib/qunit-1.11.0.js"></script> */}