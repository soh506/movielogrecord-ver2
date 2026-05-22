from rest_framework import serializers
from .models import Movie, Director, Log


class DirectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Director
        fields = ['id', 'name']


class LogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Log
        fields = ['id', 'text', 'rating', 'created_at', 'username', 'movie']
        read_only_fields = ['created_at', 'username']


class MovieSerializer(serializers.ModelSerializer):
    director_name = serializers.CharField(source='director.name', read_only=True)
    logs = LogSerializer(source='log', many=True, read_only=True)

    class Meta:
        model = Movie
        fields = ['id', 'title', 'watch_date', 'director', 'director_name', 'logs']
