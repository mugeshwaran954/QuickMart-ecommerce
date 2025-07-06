let cart={}; 
$(document).ready(function(){
    $(document).on("click",".atc",function(){ 
        alert("Added to cart!");
        let prodBox=$(this).closest(".product-box");
        let prodName=prodBox[0].querySelector("p").innerHTML.split("<br>")[0].trim();
        let prodPrice=prodBox.data("price");
        if(cart[prodName]){
            cart[prodName].qty+=1; 
        }else{
            cart[prodName]={ price:prodPrice,qty:1};
        }

        updateCartCount();
    });
});
function updateCartCount(){
    let totalItems=0;
    for (let key in cart){
        totalItems+=cart[key].qty;
    }
    $("#cart-count").text(totalItems);
}

