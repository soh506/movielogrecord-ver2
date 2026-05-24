from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.views import generic
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from myapp.models import Movie, Director, Log
from myapp.form import DirectorForm, MovieForm, LogForm
from myapp.serializers import MovieSerializer, DirectorSerializer, LogSerializer


# --- Cookie-based JWT auth views ---

def _set_access_cookie(response, access_token):
    max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
    response.set_cookie(
        'access', str(access_token),
        max_age=max_age, httponly=True,
        samesite='Lax', secure=not settings.DEBUG,
    )


def _set_refresh_cookie(response, refresh_token):
    max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
    response.set_cookie(
        'refresh', str(refresh_token),
        max_age=max_age, httponly=True,
        samesite='Lax', secure=not settings.DEBUG,
    )
    response.set_cookie(
        'logged_in', 'true',
        max_age=max_age, httponly=False,
        samesite='Lax', secure=not settings.DEBUG,
    )


class CookieTokenObtainPairView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenObtainPairSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return Response({'detail': '認証情報が無効です'}, status=status.HTTP_401_UNAUTHORIZED)

        response = Response({'detail': 'ログインしました'})
        _set_access_cookie(response, serializer.validated_data['access'])
        _set_refresh_cookie(response, serializer.validated_data['refresh'])
        return response


class CookieTokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get('refresh')
        if not raw_refresh:
            return Response({'detail': 'リフレッシュトークンがありません'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(raw_refresh)
        except TokenError:
            return Response({'detail': 'リフレッシュトークンが無効です'}, status=status.HTTP_401_UNAUTHORIZED)

        response = Response({'detail': 'トークンを更新しました'})
        _set_access_cookie(response, refresh.access_token)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({'detail': 'ログアウトしました'})
        response.delete_cookie('access', samesite='Lax')
        response.delete_cookie('refresh', samesite='Lax')
        response.delete_cookie('logged_in', samesite='Lax')
        return response


# --- DRF API ViewSets ---

class DirectorViewSet(viewsets.ModelViewSet):
    queryset = Director.objects.all()
    serializer_class = DirectorSerializer

    def destroy(self, request, *args, **kwargs):
        director = self.get_object()
        if director.movie_set.exists():
            return Response(
                {'detail': 'この監督には映画が登録されているため削除できません。先に映画を削除してください。'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class MovieViewSet(viewsets.ModelViewSet):
    queryset = Movie.objects.all().select_related('director').prefetch_related('log')
    serializer_class = MovieSerializer

    def destroy(self, request, *args, **kwargs):
        movie = self.get_object()
        if movie.log.exists():
            return Response(
                {'detail': 'ログが残っています。先にすべてのログを削除してから映画を削除してください。'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class LogViewSet(viewsets.ModelViewSet):
    queryset = Log.objects.all()
    serializer_class = LogSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def update(self, request, *args, **kwargs):
        log = self.get_object()
        if log.user is not None and log.user != request.user:
            return Response(
                {'detail': '自分のログのみ編集できます'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        log = self.get_object()
        if log.user is not None and log.user != request.user:
            return Response(
                {'detail': '自分のログのみ削除できます'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class MeView(APIView):
    def get(self, request):
        return Response({'id': request.user.id, 'username': request.user.username})


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
