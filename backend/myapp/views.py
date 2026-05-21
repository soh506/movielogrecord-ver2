from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.views import generic
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from myapp.models import Movie, Director, Log
from myapp.form import DirectorForm, MovieForm, LogForm
from myapp.serializers import MovieSerializer, DirectorSerializer, LogSerializer


# --- DRF API ViewSets ---

class DirectorViewSet(viewsets.ModelViewSet):
    queryset = Director.objects.all()
    serializer_class = DirectorSerializer


class MovieViewSet(viewsets.ModelViewSet):
    queryset = Movie.objects.all().select_related('director').prefetch_related('log')
    serializer_class = MovieSerializer


class LogViewSet(viewsets.ModelViewSet):
    queryset = Log.objects.all()
    serializer_class = LogSerializer


# --- Legacy Django template views (kept for reference) ---

def index(request):
    movie_list = Movie.objects.all()
    return render(request, 'myapp/index.html', {'movie_list': movie_list})

def moviedetail(request, pk):
    m = Movie.objects.get(pk=pk)
    return render(request, 'myapp/detail.html', {'movie': m})

def registerdirector(request):
    if request.method == "POST":
        form = DirectorForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('myapp:registermovie')
    else:
        form = DirectorForm()
    return render(request, 'myapp/register.html', {'form': form})

def registermovie(request):
    if request.method == "POST":
        form = MovieForm(request.POST)
        if form.is_valid():
            m = form.save()
            return redirect('myapp:movie_detail', pk=m.pk)
    else:
        form = MovieForm()
    return render(request, 'myapp/register.html', {'form': form})

def writinglog(request):
    if request.method == "POST":
        form = LogForm(request.POST)
        if form.is_valid():
            l = form.save()
            return redirect('myapp:movie_detail', pk=l.movie.pk)
    else:
        form = LogForm()
    return render(request, 'myapp/register.html', {'form': form})

def writingthismovielog(request, movie_id):
    obj = get_object_or_404(Movie, id=movie_id)
    if request.method == "POST":
        form = LogForm(request.POST)
        if form.is_valid():
            l = form.save()
            return redirect('myapp:movie_detail', pk=l.movie.pk)
    else:
        form = LogForm(initial={'movie': obj})
    return render(request, 'myapp/register.html', {'form': form})

def updatelog(request, pk):
    obj = get_object_or_404(Log, id=pk)
    if request.method == "POST":
        form = LogForm(request.POST, instance=obj)
        if form.is_valid():
            form.save()
            return redirect('myapp:movie_detail', pk=obj.movie.pk)
    else:
        form = LogForm(instance=obj)
    return render(request, 'myapp/register.html', {'form': form})

def deletelog(request, pk):
    obj = get_object_or_404(Log, id=pk)
    movie_id = obj.movie.pk
    if request.method == "POST":
        obj.delete()
        return redirect('myapp:movie_detail', pk=movie_id)
    return render(request, "myapp/delete.html", {'obj': obj})

def deletemovie(request, pk):
    obj = get_object_or_404(Movie, id=pk)
    if request.method == "POST":
        obj.delete()
        return redirect('myapp:index')
    return render(request, "myapp/delete.html", {'obj': obj})
