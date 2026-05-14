import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Database,
  Heart,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Star,
  Store,
  Trash2,
  UserRound,
  Utensils,
  X,
} from 'lucide-react'
import './App.css'

const API_URL =
  import.meta.env.VITE_API_URL ??
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://kwsong-production.up.railway.app')

type User = {
  id: number
  name: string
  email: string
  role: 'USER' | 'ADMIN'
}

type ShopOwner = User

type Comment = {
  id: number
  authorType: 'USER' | 'SHOP_OWNER'
  authorId: number
  content: string
  createdAt: string
}

type Review = {
  id: number
  rating: number
  content: string
  user: User
  comments: Comment[]
  createdAt: string
}

type Shop = {
  id: number
  name: string
  category: string
  address: string
  description: string | null
  owner: ShopOwner
  keepCount: number
  visitCount: number
  reviewCount: number
  averageRating: number
  reviews: Review[]
}

type Keep = {
  id: number
  shop: Shop
  createdAt: string
}

type Visit = {
  id: number
  shop: Shop
  visitedAt: string
  memo: string | null
  createdAt: string
}

type FormState = Record<string, string>

type ConfirmDialogState = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => Promise<void>
}

type AdminSession = {
  accessToken: string
  user: {
    id: number | null
    email: string
    role: 'ADMIN'
  }
}

type AdminSummary = {
  counts: {
    users: number
    shops: number
    reviews: number
    visits: number
  }
  recentShops: Shop[]
  recentReviews: (Review & { shop: Shop })[]
}

const initialUser = { name: '', email: '' }
const initialOwner = { name: '', email: '' }
const initialShop = { name: '', category: '', address: '', description: '', ownerId: '' }
const initialReview = { shopId: '', rating: '5', content: '' }
const initialReviewEdit = { rating: '5', content: '' }
const initialComment = { reviewId: '', authorType: 'USER', authorId: '', content: '' }

function todayInSeoul() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const initialVisit = { shopId: '', visitedAt: todayInSeoul(), memo: '' }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = window.localStorage.getItem('adminToken')
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '요청 실패' }))
    throw new Error(Array.isArray(error.message) ? error.message.join(', ') : error.message)
  }

  return response.json()
}

const userAuthHeaders = (userId: string | number | null | undefined): Record<string, string> =>
  userId ? { 'X-User-Id': String(userId) } : {}

function App() {
  const isAdminRoute = window.location.pathname === '/admin'
  const [users, setUsers] = useState<User[]>([])
  const [owners, setOwners] = useState<ShopOwner[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [currentKeeps, setCurrentKeeps] = useState<Keep[]>([])
  const [currentVisits, setCurrentVisits] = useState<Visit[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [userForm, setUserForm] = useState<FormState>(initialUser)
  const [ownerForm, setOwnerForm] = useState<FormState>(initialOwner)
  const [shopForm, setShopForm] = useState<FormState>(initialShop)
  const [reviewForm, setReviewForm] = useState<FormState>(initialReview)
  const [reviewEditForm, setReviewEditForm] = useState<FormState>(initialReviewEdit)
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null)
  const [commentForm, setCommentForm] = useState<FormState>(initialComment)
  const [visitForm, setVisitForm] = useState<FormState>(initialVisit)
  const [editForm, setEditForm] = useState<FormState>(initialShop)
  const [isEditingShop, setIsEditingShop] = useState(false)
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [status, setStatus] = useState('백엔드와 연결을 준비하고 있습니다.')
  const [loading, setLoading] = useState(false)
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    const token = window.localStorage.getItem('adminToken')
    const email = window.localStorage.getItem('adminEmail')
    return token && email ? { accessToken: token, user: { id: null, email, role: 'ADMIN' } } : null
  })

  const isAdmin = adminSession?.user.role === 'ADMIN'

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) ?? shops[0],
    [selectedShopId, shops],
  )

  const currentUser = useMemo(
    () => users.find((user) => String(user.id) === currentUserId),
    [currentUserId, users],
  )

  const reviewOptions = useMemo(
    () =>
      shops.flatMap((shop) =>
        shop.reviews.map((review) => ({
          value: review.id,
          label: `${shop.name} / ${review.user.name}`,
        })),
      ),
    [shops],
  )

  const keptShopIds = useMemo(
    () => new Set(currentKeeps.map((keep) => keep.shop.id)),
    [currentKeeps],
  )

  const selectedShopIsKept = selectedShop ? keptShopIds.has(selectedShop.id) : false

  const loadUserActivity = useCallback(async (userId: string) => {
    if (!userId) {
      setCurrentKeeps([])
      setCurrentVisits([])
      return
    }
    const [keeps, visits] = await Promise.all([
      request<Keep[]>(`/users/${userId}/keeps`),
      request<Visit[]>(`/users/${userId}/visits`),
    ])
    setCurrentKeeps(keeps)
    setCurrentVisits(visits)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextUsers, nextOwners, nextShops] = await Promise.all([
        request<User[]>('/users'),
        request<ShopOwner[]>('/shop-owners'),
        request<Shop[]>('/shops'),
      ])
      setUsers(nextUsers)
      setOwners(nextOwners)
      setShops(nextShops)
      setCurrentUserId((current) => current || String(nextUsers[0]?.id ?? ''))
      setSelectedShopId((current) => current ?? nextShops[0]?.id ?? null)
      setStatus('최신 데이터로 갱신했습니다.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void refresh())
  }, [refresh])

  useEffect(() => {
    queueMicrotask(() => {
      void loadUserActivity(currentUserId).catch((error) => {
        setStatus(error instanceof Error ? error.message : 'User 활동 내역을 불러오지 못했습니다.')
      })
    })
  }, [currentUserId, loadUserActivity])

  const submit = async (
    event: FormEvent,
    action: () => Promise<unknown>,
    success: string,
    reset?: () => void,
  ) => {
    event.preventDefault()
    setLoading(true)
    try {
      await action()
      reset?.()
      await refresh()
      if (currentUserId) {
        await loadUserActivity(currentUserId)
      }
      setStatus(success)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '요청을 처리하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const requireCurrentUserId = () => {
    if (!currentUserId) {
      setStatus('먼저 상단에서 현재 User를 선택해주세요.')
      return null
    }
    return Number(currentUserId)
  }

  const toggleKeep = async (shopId: number) => {
    const userId = requireCurrentUserId()
    if (!userId) return
    if (keptShopIds.has(shopId)) {
      await request(`/users/${userId}/keeps/${shopId}`, {
        method: 'DELETE',
        headers: userAuthHeaders(userId),
      })
      await refresh()
      await loadUserActivity(String(userId))
      setStatus(`${currentUser?.name ?? 'User'}의 저장 목록에서 해제했습니다.`)
      return
    }
    await request('/keeps', {
      method: 'POST',
      headers: userAuthHeaders(userId),
      body: JSON.stringify({ userId, shopId }),
    })
    await refresh()
    await loadUserActivity(String(userId))
    setStatus(`${currentUser?.name ?? 'User'}의 자주가는 맛집에 저장했습니다.`)
  }

  const updateShop = async (event: FormEvent) => {
    if (!selectedShop) return
    await submit(
      event,
      () =>
        request(`/shops/${selectedShop.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...editForm, ownerId: Number(editForm.ownerId) }),
        }),
      '맛집 정보를 수정했습니다.',
      () => setIsEditingShop(false),
    )
  }

  const startEditingShop = () => {
    if (!selectedShop) return
    setEditForm({
      name: selectedShop.name,
      category: selectedShop.category,
      address: selectedShop.address,
      description: selectedShop.description ?? '',
      ownerId: String(selectedShop.owner.id),
    })
    setIsEditingShop(true)
  }

  const confirmDelete = async () => {
    if (!confirmDialog) return
    setLoading(true)
    try {
      await confirmDialog.onConfirm()
      setConfirmDialog(null)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '삭제 요청을 처리하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const deleteShop = () => {
    if (!selectedShop) return
    const shop = selectedShop
    setConfirmDialog({
      title: '맛집 삭제',
      message: `${shop.name}을 삭제할까요? 관련 저장, 리뷰, 댓글, 방문 기록도 함께 삭제됩니다.`,
      confirmLabel: '맛집 삭제',
      onConfirm: async () => {
        await request(`/shops/${shop.id}`, { method: 'DELETE' })
        setSelectedShopId(null)
        await refresh()
        await loadUserActivity(currentUserId)
        setStatus('맛집을 삭제했습니다.')
      },
    })
  }

  const startEditingReview = (review: Review) => {
    setReviewEditForm({
      rating: String(review.rating),
      content: review.content,
    })
    setEditingReviewId(review.id)
  }

  const updateReview = async (event: FormEvent, reviewId: number) => {
    await submit(
      event,
      () =>
        request(`/reviews/${reviewId}`, {
          method: 'PUT',
          headers: userAuthHeaders(currentUserId),
          body: JSON.stringify({
            rating: Number(reviewEditForm.rating),
            content: reviewEditForm.content,
          }),
        }),
      '리뷰를 수정했습니다.',
      () => setEditingReviewId(null),
    )
  }

  const deleteReview = (review: Review) => {
    setConfirmDialog({
      title: '리뷰 삭제',
      message: '이 리뷰를 삭제할까요? 달린 댓글도 함께 삭제됩니다.',
      confirmLabel: '리뷰 삭제',
      onConfirm: async () => {
        await request(`/reviews/${review.id}`, {
          method: 'DELETE',
          headers: userAuthHeaders(currentUserId),
        })
        await refresh()
        await loadUserActivity(currentUserId)
        setStatus('리뷰를 삭제했습니다.')
      },
    })
  }

  if (isAdminRoute) {
    return <AdminPage session={adminSession} onSessionChange={setAdminSession} />
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Matzip Keep</p>
          <h1>맛집 등록, 저장, 방문, 리뷰 관리</h1>
        </div>
        <div className="topbar-actions">
          <label className="current-user">
            <span>현재 User</span>
            <select value={currentUserId} onChange={(event) => setCurrentUserId(event.target.value)}>
              <option value="">선택</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <button className="icon-button" type="button" onClick={refresh} disabled={loading} title="새로고침">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <section className="summary-band">
        <Metric icon={<UserRound />} label="User" value={users.length} />
        <Metric icon={<Building2 />} label="ShopOwner" value={owners.length} />
        <Metric icon={<Store />} label="Shop" value={shops.length} />
        <Metric icon={<Heart />} label="Save/Keep" value={shops.reduce((sum, shop) => sum + shop.keepCount, 0)} />
        <Metric icon={<Utensils />} label="Visit" value={shops.reduce((sum, shop) => sum + shop.visitCount, 0)} />
      </section>

      <div className="workspace">
        <section className="forms">
          <Panel icon={<UserRound />} title="User 등록">
            <form
              onSubmit={(event) =>
                submit(
                  event,
                  () => request('/users', { method: 'POST', body: JSON.stringify(userForm) }),
                  'User를 등록했습니다.',
                  () => setUserForm(initialUser),
                )
              }
            >
              <Input label="이름" value={userForm.name} onChange={(name) => setUserForm({ ...userForm, name })} />
              <Input label="이메일" value={userForm.email} onChange={(email) => setUserForm({ ...userForm, email })} />
              <Submit disabled={loading}>등록</Submit>
            </form>
          </Panel>

          <Panel icon={<Building2 />} title="ShopOwner 등록">
            <form
              onSubmit={(event) =>
                submit(
                  event,
                  () => request('/shop-owners', { method: 'POST', body: JSON.stringify(ownerForm) }),
                  'ShopOwner를 등록했습니다.',
                  () => setOwnerForm(initialOwner),
                )
              }
            >
              <Input label="이름" value={ownerForm.name} onChange={(name) => setOwnerForm({ ...ownerForm, name })} />
              <Input label="이메일" value={ownerForm.email} onChange={(email) => setOwnerForm({ ...ownerForm, email })} />
              <Submit disabled={loading}>등록</Submit>
            </form>
          </Panel>

          <Panel icon={<Store />} title="Shop 등록">
            <form
              onSubmit={(event) =>
                submit(
                  event,
                  () =>
                    request('/shops', {
                      method: 'POST',
                      body: JSON.stringify({ ...shopForm, ownerId: Number(shopForm.ownerId) }),
                    }),
                  '맛집을 등록했습니다.',
                  () => setShopForm(initialShop),
                )
              }
            >
              <Input label="상호명" value={shopForm.name} onChange={(name) => setShopForm({ ...shopForm, name })} />
              <Input
                label="카테고리"
                value={shopForm.category}
                onChange={(category) => setShopForm({ ...shopForm, category })}
              />
              <Input label="주소" value={shopForm.address} onChange={(address) => setShopForm({ ...shopForm, address })} />
              <Select
                label="사장님"
                value={shopForm.ownerId}
                onChange={(ownerId) => setShopForm({ ...shopForm, ownerId })}
                options={owners.map((owner) => ({ value: owner.id, label: owner.name }))}
              />
              <Input
                label="설명"
                value={shopForm.description}
                onChange={(description) => setShopForm({ ...shopForm, description })}
              />
              <Submit disabled={loading || owners.length === 0}>등록</Submit>
            </form>
          </Panel>

          <Panel icon={<Star />} title="Review 작성">
            <form
              onSubmit={(event) => {
                const userId = requireCurrentUserId()
                if (!userId) {
                  event.preventDefault()
                  return
                }
                submit(
                  event,
                  () =>
                    request('/reviews', {
                      method: 'POST',
                      headers: userAuthHeaders(userId),
                      body: JSON.stringify({
                        ...reviewForm,
                        userId,
                        shopId: Number(reviewForm.shopId),
                        rating: Number(reviewForm.rating),
                      }),
                    }),
                  '리뷰를 작성했습니다.',
                  () => setReviewForm(initialReview),
                )
              }}
            >
              <ReadonlyField label="작성 User" value={currentUser?.name ?? '상단에서 User 선택'} />
              <Select
                label="Shop"
                value={reviewForm.shopId}
                onChange={(shopId) => setReviewForm({ ...reviewForm, shopId })}
                options={shops.map((shop) => ({ value: shop.id, label: shop.name }))}
              />
              <Input
                label="평점"
                type="number"
                value={reviewForm.rating}
                onChange={(rating) => setReviewForm({ ...reviewForm, rating })}
              />
              <Input
                label="내용"
                value={reviewForm.content}
                onChange={(content) => setReviewForm({ ...reviewForm, content })}
              />
              <Submit disabled={loading || !currentUserId || shops.length === 0}>작성</Submit>
            </form>
          </Panel>

          <Panel icon={<MessageSquare />} title="Comment 작성">
            <form
              onSubmit={(event) => {
                const authorId =
                  commentForm.authorType === 'USER'
                    ? requireCurrentUserId()
                    : Number(commentForm.authorId)
                if (!authorId) {
                  event.preventDefault()
                  return
                }
                submit(
                  event,
                  () =>
                    request('/comments', {
                      method: 'POST',
                      headers: userAuthHeaders(commentForm.authorType === 'USER' ? authorId : currentUserId),
                      body: JSON.stringify({
                        ...commentForm,
                        reviewId: Number(commentForm.reviewId),
                        authorId,
                      }),
                    }),
                  '댓글을 작성했습니다.',
                  () => setCommentForm(initialComment),
                )
              }}
            >
              <Select
                label="Review"
                value={commentForm.reviewId}
                onChange={(reviewId) => setCommentForm({ ...commentForm, reviewId })}
                options={reviewOptions}
              />
              <Select
                label="작성자 유형"
                value={commentForm.authorType}
                onChange={(authorType) => setCommentForm({ ...commentForm, authorType })}
                options={[
                  { value: 'USER', label: 'User' },
                  { value: 'SHOP_OWNER', label: 'ShopOwner' },
                ]}
              />
              {commentForm.authorType === 'USER' ? (
                <ReadonlyField label="작성 User" value={currentUser?.name ?? '상단에서 User 선택'} />
              ) : (
                <Select
                  label="ShopOwner"
                  value={commentForm.authorId}
                  onChange={(authorId) => setCommentForm({ ...commentForm, authorId })}
                  options={owners.map((owner) => ({ value: owner.id, label: owner.name }))}
                />
              )}
              <Input
                label="내용"
                value={commentForm.content}
                onChange={(content) => setCommentForm({ ...commentForm, content })}
              />
              <Submit disabled={loading || reviewOptions.length === 0}>작성</Submit>
            </form>
          </Panel>

          <Panel icon={<Utensils />} title="Visit 기록">
            <form
              onSubmit={(event) => {
                const userId = requireCurrentUserId()
                if (!userId) {
                  event.preventDefault()
                  return
                }
                submit(
                  event,
                  () =>
                    request('/visits', {
                      method: 'POST',
                      headers: userAuthHeaders(userId),
                      body: JSON.stringify({
                        ...visitForm,
                        userId,
                        shopId: Number(visitForm.shopId),
                      }),
                    }),
                  '방문 횟수를 기록했습니다.',
                  () => setVisitForm(initialVisit),
                )
              }}
            >
              <ReadonlyField label="방문 User" value={currentUser?.name ?? '상단에서 User 선택'} />
              <Select
                label="Shop"
                value={visitForm.shopId}
                onChange={(shopId) => setVisitForm({ ...visitForm, shopId })}
                options={shops.map((shop) => ({ value: shop.id, label: shop.name }))}
              />
              <Input
                label="방문일"
                type="date"
                value={visitForm.visitedAt}
                onChange={(visitedAt) => setVisitForm({ ...visitForm, visitedAt })}
              />
              <Input label="메모" value={visitForm.memo} onChange={(memo) => setVisitForm({ ...visitForm, memo })} />
              <Submit disabled={loading || !currentUserId || shops.length === 0}>기록</Submit>
            </form>
          </Panel>
        </section>

        <section className="content">
          <div className="status-line">{status}</div>
          <div className="shop-list">
            {shops.map((shop) => (
              <button
                className={shop.id === selectedShop?.id ? 'shop-row active' : 'shop-row'}
                key={shop.id}
                type="button"
                onClick={() => {
                  setSelectedShopId(shop.id)
                  setIsEditingShop(false)
                }}
              >
                <span>
                  <strong>{shop.name}</strong>
                  <small>
                    {shop.category} · {shop.owner.name}
                  </small>
                </span>
                <span>{shop.averageRating.toFixed(1)}</span>
              </button>
            ))}
          </div>

          <section className="activity-grid">
            <div className="activity-panel">
              <div className="activity-title">
                <Heart size={17} />
                <h2>내 저장 맛집</h2>
              </div>
              {currentKeeps.length === 0 ? (
                <p className="empty">저장한 맛집이 없습니다.</p>
              ) : (
                <ul className="activity-list">
                  {currentKeeps.map((keep) => (
                    <li key={keep.id}>
                      <button type="button" onClick={() => setSelectedShopId(keep.shop.id)}>
                        <strong>{keep.shop.name}</strong>
                        <span>{keep.shop.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="activity-panel">
              <div className="activity-title">
                <Utensils size={17} />
                <h2>내 방문 기록</h2>
              </div>
              {currentVisits.length === 0 ? (
                <p className="empty">방문 기록이 없습니다.</p>
              ) : (
                <ul className="activity-list">
                  {currentVisits.map((visit) => (
                    <li key={visit.id}>
                      <button type="button" onClick={() => setSelectedShopId(visit.shop.id)}>
                        <strong>{visit.shop.name}</strong>
                        <span>
                          {visit.visitedAt}
                          {visit.memo ? ` · ${visit.memo}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {selectedShop ? (
            <article className="detail">
              {isEditingShop ? (
                <form className="edit-form" onSubmit={updateShop}>
                  <div className="detail-header">
                    <div>
                      <p className="eyebrow">Shop 수정</p>
                      <h2>{selectedShop.name}</h2>
                    </div>
                    <div className="detail-actions">
                      <button className="secondary-button" type="button" onClick={() => setIsEditingShop(false)}>
                        <X size={16} />
                        취소
                      </button>
                      <button className="keep-button" type="submit" disabled={loading}>
                        <Save size={16} />
                        저장
                      </button>
                    </div>
                  </div>
                  <div className="edit-grid">
                    <Input label="상호명" value={editForm.name} onChange={(name) => setEditForm({ ...editForm, name })} />
                    <Input
                      label="카테고리"
                      value={editForm.category}
                      onChange={(category) => setEditForm({ ...editForm, category })}
                    />
                    <Input label="주소" value={editForm.address} onChange={(address) => setEditForm({ ...editForm, address })} />
                    <Select
                      label="사장님"
                      value={editForm.ownerId}
                      onChange={(ownerId) => setEditForm({ ...editForm, ownerId })}
                      options={owners.map((owner) => ({ value: owner.id, label: owner.name }))}
                    />
                    <Input
                      label="설명"
                      value={editForm.description}
                      onChange={(description) => setEditForm({ ...editForm, description })}
                    />
                  </div>
                </form>
              ) : (
                <>
                  <div className="detail-header">
                    <div>
                      <p className="eyebrow">{selectedShop.category}</p>
                      <h2>{selectedShop.name}</h2>
                      <p>{selectedShop.address}</p>
                    </div>
                    <div className="detail-actions">
                      {isAdmin && (
                        <>
                          <button className="secondary-button" type="button" onClick={startEditingShop}>
                            <Pencil size={16} />
                            수정
                          </button>
                          <button className="danger-button" type="button" onClick={deleteShop} disabled={loading}>
                            <Trash2 size={16} />
                            삭제
                          </button>
                        </>
                      )}
                      <button
                        className={selectedShopIsKept ? 'secondary-button' : 'keep-button'}
                        type="button"
                        onClick={() => toggleKeep(selectedShop.id)}
                      >
                        <Heart size={18} />
                        {selectedShopIsKept ? '저장 해제' : '저장'}
                      </button>
                    </div>
                  </div>
                  <p className="description">{selectedShop.description || '등록된 설명이 없습니다.'}</p>
                  <div className="detail-metrics">
                    <Metric icon={<Heart />} label="저장" value={selectedShop.keepCount} />
                    <Metric icon={<Utensils />} label="방문" value={selectedShop.visitCount} />
                    <Metric icon={<Star />} label="리뷰" value={selectedShop.reviewCount} />
                  </div>
                  <div className="review-list">
                    {selectedShop.reviews.length === 0 ? (
                      <p className="empty">아직 리뷰가 없습니다.</p>
                    ) : (
                      selectedShop.reviews.map((review) => (
                        <div className="review" key={review.id}>
                          {editingReviewId === review.id ? (
                            <form className="review-edit-form" onSubmit={(event) => updateReview(event, review.id)}>
                              <div className="review-head">
                                <strong>{review.user.name}</strong>
                                <div className="review-actions">
                                  <button
                                    className="secondary-button compact-button"
                                    type="button"
                                    onClick={() => setEditingReviewId(null)}
                                  >
                                    <X size={14} />
                                    취소
                                  </button>
                                  <button className="keep-button compact-button" type="submit" disabled={loading}>
                                    <Save size={14} />
                                    저장
                                  </button>
                                </div>
                              </div>
                              <div className="review-edit-grid">
                                <Input
                                  label="평점"
                                  type="number"
                                  value={reviewEditForm.rating}
                                  onChange={(rating) => setReviewEditForm({ ...reviewEditForm, rating })}
                                />
                                <Input
                                  label="내용"
                                  value={reviewEditForm.content}
                                  onChange={(content) => setReviewEditForm({ ...reviewEditForm, content })}
                                />
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="review-head">
                                <strong>{review.user.name}</strong>
                                <div className="review-actions">
                                  <span>{'★'.repeat(review.rating)}</span>
                                  {String(review.user.id) === currentUserId && (
                                    <>
                                      <button
                                        className="secondary-button compact-button"
                                        type="button"
                                        onClick={() => startEditingReview(review)}
                                      >
                                        <Pencil size={14} />
                                        수정
                                      </button>
                                      <button
                                        className="danger-button compact-button"
                                        type="button"
                                        onClick={() => deleteReview(review)}
                                        disabled={loading}
                                      >
                                        <Trash2 size={14} />
                                        삭제
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <p>{review.content}</p>
                              {review.comments.map((comment) => (
                                <div className="comment" key={comment.id}>
                                  <span>
                                    {comment.authorType === 'USER' ? 'User' : 'ShopOwner'} #{comment.authorId}
                                  </span>
                                  <p>{comment.content}</p>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </article>
          ) : (
            <article className="detail empty-state">
              <Store size={34} />
              <h2>맛집을 등록해주세요.</h2>
            </article>
          )}
        </section>
      </div>

      {confirmDialog && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setConfirmDialog(null)}>
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="confirm-icon">
              <Trash2 size={24} />
            </div>
            <div>
              <h2 id="confirm-title">{confirmDialog.title}</h2>
              <p>{confirmDialog.message}</p>
            </div>
            <div className="confirm-actions">
              <button className="secondary-button" type="button" onClick={() => setConfirmDialog(null)}>
                취소
              </button>
              <button className="danger-button solid-danger" type="button" onClick={confirmDelete} disabled={loading}>
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function AdminPage({
  session,
  onSessionChange,
}: {
  session: AdminSession | null
  onSessionChange: (session: AdminSession | null) => void
}) {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [message, setMessage] = useState(session ? '관리자 데이터를 불러오고 있습니다.' : '관리자로 로그인해주세요.')
  const [loading, setLoading] = useState(false)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const nextSummary = await request<AdminSummary>('/admin/summary')
      setSummary(nextSummary)
      setMessage('관리자 데이터를 불러왔습니다.')
    } catch (error) {
      setSummary(null)
      setMessage(error instanceof Error ? error.message : '관리자 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) {
      queueMicrotask(() => void loadSummary())
    }
  }, [session, loadSummary])

  const login = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      const nextSession = await request<AdminSession>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      })
      window.localStorage.setItem('adminToken', nextSession.accessToken)
      window.localStorage.setItem('adminEmail', nextSession.user.email)
      onSessionChange(nextSession)
      setMessage('관리자로 로그인했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '관리자 로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    window.localStorage.removeItem('adminToken')
    window.localStorage.removeItem('adminEmail')
    onSessionChange(null)
    setSummary(null)
    setMessage('로그아웃했습니다.')
  }

  if (!session) {
    return (
      <main className="app-shell admin-shell">
        <section className="admin-login-panel">
          <div className="panel-title">
            <ShieldCheck />
            <h1>관리자 로그인</h1>
          </div>
          <form onSubmit={login}>
            <Input
              label="이메일"
              value={loginForm.email}
              onChange={(email) => setLoginForm({ ...loginForm, email })}
            />
            <Input
              label="비밀번호"
              type="password"
              value={loginForm.password}
              onChange={(password) => setLoginForm({ ...loginForm, password })}
            />
            <Submit disabled={loading}>로그인</Submit>
          </form>
          <p className="status-line">{message}</p>
          <a className="admin-link" href="/">
            서비스 화면으로 이동
          </a>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell admin-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>서비스 관리자</h1>
          <p>{session.user.email}</p>
        </div>
        <div className="topbar-actions">
          <button className="secondary-button" type="button" onClick={loadSummary} disabled={loading}>
            <RefreshCw size={16} />
            새로고침
          </button>
          <button className="danger-button" type="button" onClick={logout}>
            로그아웃
          </button>
          <a className="secondary-button admin-link-button" href="/">
            서비스 화면
          </a>
        </div>
      </header>

      <div className="status-line">{message}</div>

      {summary ? (
        <>
          <section className="summary-band">
            <Metric icon={<UserRound />} label="전체 유저" value={summary.counts.users} />
            <Metric icon={<Store />} label="전체 맛집" value={summary.counts.shops} />
            <Metric icon={<Star />} label="전체 리뷰" value={summary.counts.reviews} />
            <Metric icon={<Utensils />} label="전체 방문" value={summary.counts.visits} />
          </section>

          <section className="admin-grid">
            <article className="detail">
              <div className="detail-header">
                <div>
                  <p className="eyebrow">Recent Shops</p>
                  <h2>최근 등록된 맛집</h2>
                </div>
              </div>
              <ul className="admin-list">
                {summary.recentShops.map((shop) => (
                  <li key={shop.id}>
                    <strong>{shop.name}</strong>
                    <span>
                      {shop.category} · {shop.owner.name}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="detail">
              <div className="detail-header">
                <div>
                  <p className="eyebrow">Recent Reviews</p>
                  <h2>최근 작성된 리뷰</h2>
                </div>
              </div>
              <ul className="admin-list">
                {summary.recentReviews.map((review) => (
                  <li key={review.id}>
                    <strong>
                      {review.shop.name} · {review.rating}점
                    </strong>
                    <span>{review.content}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <ErdSection />
        </>
      ) : (
        <article className="detail empty-state">
          <ShieldCheck size={34} />
          <h2>관리자 데이터가 없습니다.</h2>
        </article>
      )}
    </main>
  )
}

const erdEntities = [
  {
    name: 'User',
    description: '맛집을 저장하고 리뷰와 방문 기록을 남기는 사용자',
    fields: ['id', 'name', 'email', 'role'],
    relations: ['Keep', 'Review', 'Comment', 'Visit'],
  },
  {
    name: 'ShopOwner',
    description: '맛집 사장님 계정',
    fields: ['id', 'name', 'email'],
    relations: ['Shop', 'Comment'],
  },
  {
    name: 'Shop',
    description: '사용자가 저장하고 방문하는 맛집',
    fields: ['id', 'name', 'category', 'address', 'description'],
    relations: ['ShopOwner', 'Keep', 'Review', 'Comment', 'Visit'],
  },
  {
    name: 'Keep',
    description: 'User가 Shop을 저장한 기록',
    fields: ['id', 'userId', 'shopId'],
    relations: ['User', 'Shop'],
  },
  {
    name: 'Review',
    description: 'User가 Shop에 남긴 리뷰',
    fields: ['id', 'rating', 'content', 'userId', 'shopId'],
    relations: ['User', 'Shop', 'Comment'],
  },
  {
    name: 'Comment',
    description: 'User 또는 ShopOwner가 리뷰/맛집에 남기는 댓글',
    fields: ['id', 'authorType', 'authorId', 'content', 'shopId', 'reviewId'],
    relations: ['User', 'ShopOwner', 'Shop', 'Review'],
  },
  {
    name: 'Visit',
    description: 'User의 Shop 방문 기록',
    fields: ['id', 'userId', 'shopId', 'visitedAt'],
    relations: ['User', 'Shop'],
  },
]

const erdRelations = [
  'ShopOwner 1 : N Shop',
  'User 1 : N Keep',
  'Shop 1 : N Keep',
  'User 1 : N Review',
  'Shop 1 : N Review',
  'User 1 : N Visit',
  'Shop 1 : N Visit',
  'Shop 1 : N Comment',
  'Review 1 : N Comment',
  'User 또는 ShopOwner 1 : N Comment',
]

function ErdSection() {
  return (
    <section className="detail erd-section">
      <div className="detail-header">
        <div>
          <p className="eyebrow">ERD / Schema</p>
          <h2>엔티티 관계도</h2>
        </div>
        <Database size={22} />
      </div>

      <div className="erd-layout">
        <div className="erd-cards">
          {erdEntities.map((entity) => (
            <article className="erd-card" key={entity.name}>
              <div className="erd-card-title">
                <strong>{entity.name}</strong>
                <span>{entity.relations.length} relations</span>
              </div>
              <p>{entity.description}</p>
              <div className="erd-fields">
                {entity.fields.map((field) => (
                  <code key={field}>{field}</code>
                ))}
              </div>
            </article>
          ))}
        </div>

        <aside className="erd-relations">
          <h3>관계 요약</h3>
          <ul>
            {erdRelations.map((relation) => (
              <li key={relation}>{relation}</li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label>
      <span>{label}</span>
      <input required={label !== '설명' && label !== '메모'} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string | number; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span>{label}</span>
      <select required value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">선택</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <label>
      <span>{label}</span>
      <output>{value}</output>
    </label>
  )
}

function Submit({ children, disabled }: { children: string; disabled: boolean }) {
  return (
    <button className="submit-button" type="submit" disabled={disabled}>
      <Plus size={16} />
      {children}
    </button>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
