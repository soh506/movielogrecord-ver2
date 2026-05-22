from rest_framework import serializers
from .models import Movie, Director, Log


class DirectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Director
        fields = ['id', 'name']


class LogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Log
        fields = ['id', 'text', 'rating', 'movie']


class MovieSerializer(serializers.ModelSerializer):
    director_name = serializers.CharField(source='director.name', read_only=True)
    logs = LogSerializer(source='log', many=True, read_only=True)

    class Meta:
        model = Movie
        fields = ['id', 'title', 'watch_date', 'director', 'director_name', 'logs']
