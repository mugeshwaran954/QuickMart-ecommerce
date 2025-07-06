function fetchProducts() {
    let pageCategory = "";
    if (window.location.pathname.includes("f&vadmin.html")) pageCategory = "CAT001";
    else if (window.location.pathname.includes("home&kitchenadmin.html")) pageCategory = "CAT002";
    else if (window.location.pathname.includes("packagedfoodsadmin.html")) pageCategory = "CAT003";
    else if (window.location.pathname.includes("personalcareadmin.html")) pageCategory = "CAT004";

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

    let queryString = queryParams.length > 0 ? "?" + queryParams.join("&") : "";

    console.log("Final Query String Sent to Server:", queryString);

    $.get(`http://localhost:7000/products${queryString}`, (products) => {
        $("#productList").empty();

        if (products.length === 0) {
            $("#productList").html("<p>No products found</p>");
            return;
        }

        products.forEach((product) => {
            let productHTML = `
                <div class="product-box" data-id="${product._id}" data-category="${product.subcat}" data-price="${product.price}">
                    <img src="http://localhost:7000/images/${product.image_url}" class="prod">
                    <input type="text" class="product-name" value="${product.name}" disabled>
                    <p>Description: <textarea class="desc-input" disabled>${product.description || 'No description'}</textarea></p>
                    <p>Price: ₹<input type="number" class="price-input" value="${product.price}" disabled></p>
                    <p>Current Price: ₹<input type="number" class="current-price-input" value="${product.current_price}" disabled></p>
                    <p>Stock: <input type="number" class="stock-input" value="${product.stock_quantity}" disabled></p>
                    <button class="update">Update</button>
                </div>
            `;
            $("#productList").append(productHTML);
        });
    }).fail((err) => {
        console.error("Error fetching products:", err);
    });
}



$(document).ready(() => {
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

    fetchProducts();
});

$("#addProductForm").submit(function (event) {
    event.preventDefault();

    let confirmation = confirm("Are you sure you want to add this product?");
    if (!confirmation) return;

    let category_id = "";
    if (window.location.pathname.includes("f&vadmin.html")) category_id = "CAT001";
    else if (window.location.pathname.includes("home&kitchenadmin.html")) category_id = "CAT002";
    else if (window.location.pathname.includes("packagedfoodsadmin.html")) category_id = "CAT003";
    else if (window.location.pathname.includes("personalcareadmin.html")) category_id = "CAT004";

    let price = parseFloat($("#productPrice").val());
    let current_price = parseFloat($("#productCurrentPrice").val());
    let stock_quantity = parseInt($("#productStock").val());

    if (
        isNaN(price) || price < 0 ||
        isNaN(current_price) || current_price < 0 ||
        isNaN(stock_quantity) || stock_quantity < 0
    ) {
        alert("Enter valid non-negative numeric values for price, current price, and stock.");
        return;
    }

    if (current_price > price) {
        alert("Current price cannot be greater than the original price.");
        return;
    }

    let formData = new FormData();
    formData.append("name", $("#productName").val().trim());
    formData.append("description", $("#productDesc").val().trim());
    formData.append("price", price);
    formData.append("current_price", current_price);
    formData.append("stock_quantity", stock_quantity);
    formData.append("subcat", $("#productCategory").val()); 
    formData.append("image", $("#productImage")[0].files[0]);
    formData.append("category_id", category_id);

    $.ajax({
        url: "http://localhost:7000/products",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function () {
            alert("Product successfully added!");
            $("#addProductForm")[0].reset();
            fetchProducts(); 
        },
        error: function (xhr) {
            console.error("Error:", xhr.responseText);
            alert("Error adding product: " + xhr.responseText);
        }
    });
});
$("#category-search").on("keyup", function () {
const searchVal = $(this).val().toLowerCase();
let anyVisible = false;

$(".product-box").each(function () {
    const name = $(this).find(".product-name").val().toLowerCase();
    if (name.includes(searchVal)) {
        $(this).show();
        anyVisible = true;
    } else {
        $(this).hide();
    }
});

if (!anyVisible) {
    if ($("#no-results").length === 0) {
        $("#productList").append("<p id='no-results'>No results found</p>");
    }
} else {
    $("#no-results").remove();
}
});
$(document).on("click", ".update", function () {
    let productBox = $(this).closest(".product-box");

    let productId = productBox.attr("data-id"); 
    let inputs = productBox.find(".product-name, .desc-input, .price-input, .current-price-input, .stock-input");
    let button = $(this);

    if (button.text() === "Update") {
        inputs.prop("disabled", false);
        button.text("Save");
    } else if (confirm("Are you sure you want to update this product?")) {
        let updatedProduct = {
            _id: productId, 
            name: productBox.find(".product-name").val().trim(),
            description: productBox.find(".desc-input").val().trim(),
            price: parseFloat(productBox.find(".price-input").val()),
            current_price: parseFloat(productBox.find(".current-price-input").val()),
            stock_quantity: parseInt(productBox.find(".stock-input").val())
        };

        if (
            isNaN(updatedProduct.price) || updatedProduct.price < 0 ||
            isNaN(updatedProduct.current_price) || updatedProduct.current_price < 0 ||
            isNaN(updatedProduct.stock_quantity) || updatedProduct.stock_quantity < 0
        ) {
            alert("Please enter valid non-negative numeric values for price, current price, and stock.");
            return;
        }

        $.ajax({
            url: `http://localhost:7000/products/${productId}`,
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify(updatedProduct),
            success: function (response) {
                alert("Product updated successfully!");
                inputs.prop("disabled", true);
                button.text("Update");

                productBox.attr("data-id", updatedProduct._id);
            },
            error: function (xhr) {
                console.error("Update Error:", xhr.responseText);
                alert("Error updating product: " + xhr.responseText);
            }
        });
    }
});
   