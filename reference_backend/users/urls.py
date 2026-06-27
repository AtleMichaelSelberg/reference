from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('me/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('', views.UserListView.as_view(), name='user_list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    path('<int:pk>/profile/', views.UserProfileView.as_view(), name='user_profile'),
    path('candidates/', views.CandidatesView.as_view(), name='candidates'),
    path('feedback/', views.FeedbackView.as_view(), name='feedback'),
]
