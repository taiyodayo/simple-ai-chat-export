const back = document.getElementById("back");
back.href = "#";
back.addEventListener("click", (event) => {
  event.preventDefault();
  history.back();
});
