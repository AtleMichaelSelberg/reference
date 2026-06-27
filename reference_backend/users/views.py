from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User, Endorsement, Feedback
from .serializers import UserSerializer, UserSummarySerializer, EndorsementSerializer, RegisterSerializer, ChangePasswordSerializer, FeedbackSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer


class MeView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated successfully.'})


class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class CandidatesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ids = (
            User.objects
            .filter(is_superuser=False)
            .exclude(pk=request.user.pk)
            .order_by('id')
            .values_list('id', flat=True)
        )
        return Response({'user_ids': list(ids)})


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            user = (
                User.objects
                .prefetch_related('profile_pictures')
                .get(pk=pk)
            )
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        endorsements = (
            Endorsement.objects
            .filter(Q(first_user=user) | Q(second_user=user))
            .select_related('first_user', 'second_user')
            .prefetch_related('first_user__profile_pictures', 'second_user__profile_pictures')
        )

        return Response({
            'user': UserSummarySerializer(user).data,
            'endorsements': EndorsementSerializer(endorsements, many=True).data,
        })


class FeedbackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = FeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
