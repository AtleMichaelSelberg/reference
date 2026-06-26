import base64
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, ProfilePicture, Endorsement


class ProfilePictureSerializer(serializers.ModelSerializer):
    image_data = serializers.SerializerMethodField()

    def get_image_data(self, obj):
        if obj.image_data:
            return base64.b64encode(bytes(obj.image_data)).decode('utf-8')
        return None

    class Meta:
        model = ProfilePicture
        fields = ['id', 'order', 'is_primary', 'image_data', 'image_url']


class UserSummarySerializer(serializers.ModelSerializer):
    profile_pictures = ProfilePictureSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'bio', 'profile_pictures']


class EndorsementSerializer(serializers.ModelSerializer):
    first_user = UserSummarySerializer(read_only=True)
    second_user = UserSummarySerializer(read_only=True)
    is_romantic = serializers.BooleanField(read_only=True)

    class Meta:
        model = Endorsement
        fields = [
            'id',
            'first_user', 'second_user',
            'first_user_approved', 'second_user_approved',
            'endorsement_type', 'is_romantic',
            'is_joining_endorsement',
            'first_user_statement', 'second_user_statement',
            'first_user_did_approve_text', 'second_user_did_approve_text',
            'created_at', 'updated_at',
        ]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'bio', 'avatar_url', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'password_confirm']
        read_only_fields = ['id']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        return User.objects.create_user(**validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value
