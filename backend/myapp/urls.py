from django.urls import path, include
from rest_framework.routers import DefaultRouter
from myapp import views

app_name = 'myapp'

router = DefaultRouter()
router.register(r'movies', views.MovieViewSet)
router.register(r'directors', views.DirectorViewSet)
router.register(r'logs', views.LogViewSet)

urlpatterns = [
    # API
    path('', include(router.urls)),

    # Legacy template views
    path('legacy/', views.index, name='index'),
    path('legacy/movie/<int:pk>/', views.moviedetail, name='movie_detail'),
    path('legacy/register/director/', views.registerdirector, name='registerdirector'),
    path('legacy/register/movie/', views.registermovie, name='registermovie'),
    path('legacy/writing/log/', views.writinglog, name='writinglog'),
    path('legacy/writing/thismovie/<int:movie_id>/log/', views.writingthismovielog, name='writingthismovielog'),
    path('legacy/update/log/<int:pk>/', views.updatelog, name='updatelog'),
    path('legacy/delete/log/<int:pk>/', views.deletelog, name='deletelog'),
    path('legacy/delete/movie/<int:pk>/', views.deletemovie, name='deletemovie'),
]
