import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from '@/shared/components/Layout'
import { RequireAuth } from '@/shared/components/RequireAuth'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { LandingRedirect } from './LandingRedirect'
import { LoginPage } from '@/modules/auth/LoginPage'
import { RegisterPage } from '@/modules/auth/RegisterPage'
import { ChangePasswordPage } from '@/modules/auth/ChangePasswordPage'
import { SecurityPage } from '@/modules/account/SecurityPage'
import { RequiredTwoFactorPage } from '@/modules/account/RequiredTwoFactorPage'
import { WallDisplayPage } from '@/modules/live/WallDisplayPage'
import { DevicesPage } from '@/modules/devices/DevicesPage'
import { DeviceDetailPage } from '@/modules/devices/DeviceDetailPage'
import { MapPage } from '@/modules/map/MapPage'
import { TrackPlaybackPage } from '@/modules/track-playback/TrackPlaybackPage'
import { GroupCallPage } from '@/modules/group-call/GroupCallPage'
import { PhotosPage } from '@/modules/media/PhotosPage'
import { VideosPage } from '@/modules/media/VideosPage'
import { AlarmsPage } from '@/modules/alarms/AlarmsPage'
import { UsersPage } from '@/modules/users/UsersPage'
import { UnitSettingPage } from '@/modules/unit-settings/UnitSettingPage'
import { WifiPage } from '@/modules/wifi/WifiPage'
import { ProfilePage } from '@/modules/profile/ProfilePage'

function UnauthorizedPage() {
  return (
    <div className="max-w-md">
      <h1 className="mb-2 text-lg font-semibold text-slate-800">Not authorized</h1>
      <p className="text-sm text-slate-500">
        Your role doesn't include access to that module.{' '}
        <Link to="/" className="text-brand-primary underline">
          Go back
        </Link>
        .
      </p>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="max-w-md">
      <h1 className="mb-2 text-lg font-semibold text-slate-800">Page not found</h1>
      <p className="text-sm text-slate-500">
        <Link to="/" className="text-brand-primary underline">
          Return to the dashboard
        </Link>
        .
      </p>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePasswordPage />
          </RequireAuth>
        }
      />

      <Route
        path="/setup-2fa"
        element={
          <RequireAuth>
            <RequiredTwoFactorPage />
          </RequireAuth>
        }
      />

      <Route
        path="/wall"
        element={
          <RequireAuth>
            <ProtectedRoute perm="live:read">
              <WallDisplayPage />
            </ProtectedRoute>
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<LandingRedirect />} />
        <Route
          path="devices"
          element={
            <ProtectedRoute perm="devices:read">
              <DevicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="devices/:id"
          element={
            <ProtectedRoute perm="devices:read">
              <DeviceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="map"
          element={
            <ProtectedRoute perm="map:read">
              <MapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="track-playback"
          element={
            <ProtectedRoute perm="trackPlayback:read">
              <TrackPlaybackPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="group-call"
          element={
            <ProtectedRoute perm="groupCall:read">
              <GroupCallPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="photos"
          element={
            <ProtectedRoute perm="photos:read">
              <PhotosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="videos"
          element={
            <ProtectedRoute perm="videos:read">
              <VideosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="alarms"
          element={
            <ProtectedRoute perm="alarms:read">
              <AlarmsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute perm="users:read">
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="unit-setting"
          element={
            <ProtectedRoute perm="unitSettings:read">
              <UnitSettingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="wifi"
          element={
            <ProtectedRoute perm="wifi:read">
              <WifiPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute perm="profile:read">
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route path="account/security" element={<SecurityPage />} />

        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
