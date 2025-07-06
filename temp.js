$(document).ready(() => {
    function fetchProducts() {
        let pageCategory = "";
        if (window.location.pathname.includes("fruits.html")) pageCategory = "CAT001";
        else if (window.location.pathname.includes("home.html")) pageCategory = "CAT002";
        else if (window.location.pathname.includes("packaged.html")) pageCategory = "CAT003";
        else if (window.location.pathname.includes("personalcare.html")) pageCategory = "CAT004";

        let subcategoryFilter = [];
        
        if ($("#all-products").prop("checked")) {
            subcategoryFilter = [];
        } else {
            $(".category:checked").each(function () {
                let subcat = $(this).val().trim();
                if (subcat) subcategoryFilter.push(encodeURIComponent(subcat));
            });
        }

        let queryParams = [`category=${pageCategory}`];

        if (subcategoryFilter.length > 0) {
            queryParams.push(`subcategories=${subcategoryFilter.join(",")}`);
        }

        let sortOrder = $("#sort-price").val();
        if (sortOrder) {
            queryParams.push(`sort=${sortOrder}`);
        }

        let queryString = queryParams.length > 0 ? "?" + queryParams.join("&") : "";

        console.log("Final Query String Sent to Server:", queryString);

        $.get(`/products${queryString}`, (products) => {
            $(".products").empty();

            if (products.length === 0) {
                $(".products").html("<p>No products found</p>");
                return;
            }

            products.forEach((prod) => {
                let discount = Math.round(((prod.price - prod.current_price) / prod.price) * 100);

                let productHTML = `
                <div class="product-box" data-product-id="${prod._id}">
                    <img src="images/${prod.image_url}" class="prod">
                    <p>${prod.name}<br>${prod.description}<br>
                        <s>₹${prod.price}</s>&nbsp;&nbsp;
                        <span class="disc">${discount}% OFF</span><br>
                        ₹${prod.current_price}
                    </p>
                    <button class="atc">Add to cart</button>
                </div>`;

                $(".products").append(productHTML);
            });
        }).fail((err) => {
            console.error("Error fetching products:", err);
        });
    }

    $("#all-products").change(function () {
        if ($(this).prop("checked")) {
            $(".category").prop("checked", false);
        }
        fetchProducts();
    });

    $(".category").change(function () {
        if ($(".category:checked").length > 0) {
            $("#all-products").prop("checked", false);
        } else {
            $("#all-products").prop("checked", true);
        }
        fetchProducts();
    });

    $("#sort-price").change(fetchProducts);

    fetchProducts();

    $(document).on("click", ".atc", function () {
        const productBox = $(this).closest(".product-box");
    
        const productData = {
            product_id: productBox.data("product-id"),
            product_name: productBox.find("p").contents().get(0).nodeValue.trim(),  
            current_price: parseFloat(productBox.find("span:last").text().replace("₹", "")), 
            quantity: 1  
        };
    
        $.post("/add-to-cart", productData, function (response) {
            alert(response.message);
        }).fail(function (err) {
            alert(err.responseJSON?.error || "Error adding to cart");
        });
    });
    $("#search-bar").keypress(function (event) {
        if (event.key === "Enter") {
            let query = $(this).val().trim();
            if (query) {
                window.location.href = `searchbar.html?q=${encodeURIComponent(query)}`;
            }
        }
    });
    $(".nav3, #sidebar").hover(
        function() {
            $("#sidebar").fadeIn();
        },
        function() {
            $("#sidebar").fadeOut();
        }
    );
    
    $("#logout").click(function (event) {
        event.preventDefault(); 
    
        $.post("/logout", function (response) {
            alert(response.message);
            window.location.href = "homepg.html"; 
        }).fail(function (err) { 
            alert("Logout failed. Please try again.");
        });
    });

    $("#loc").keypress(function (e) {
        if (e.key === "Enter") {
            let pincode = $(this).val().trim();
            const chennaiPattern = /^600[01]\d{2}$/;

            if (chennaiPattern.test(pincode)) {
                alert("Location accessible");
            } else {
                alert("Location not accessible");
            }
        }
    });

});
