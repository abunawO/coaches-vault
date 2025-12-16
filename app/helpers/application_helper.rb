module ApplicationHelper
  def nav_link_class(path)
    classes = ["nav-link"]
    classes << "active" if current_page?(path)
    classes.join(" ")
  end
end
