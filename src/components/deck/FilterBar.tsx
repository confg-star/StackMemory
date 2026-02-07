'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, X } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color: string
}

interface FilterBarProps {
  tags: Tag[]
  selectedTagId?: string
  searchQuery?: string
  totalCount: number
  onTagSelect: (tagId?: string) => void
  onSearch: (query: string) => void
}

export function FilterBar({
  tags,
  selectedTagId,
  searchQuery = '',
  totalCount,
  onTagSelect,
  onSearch,
}: FilterBarProps) {
  const [search, setSearch] = useState(searchQuery)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)
  }

  const handleSearchSubmit = () => {
    onSearch(search)
  }

  const handleClearFilters = () => {
    setSearch('')
    onSearch('')
    onTagSelect(undefined)
  }

  const selectedTag = tags.find((t) => t.id === selectedTagId)

  return (
    <div className="space-y-4">
      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索问题或答案..."
            value={search}
            onChange={handleSearchChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            className="pl-9"
          />
        </div>
      </div>

      {/* 标签筛选 */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!selectedTagId ? 'default' : 'outline'}
          size="sm"
          onClick={() => onTagSelect(undefined)}
        >
          全部 ({totalCount})
        </Button>
        {tags.map((tag) => (
          <Button
            key={tag.id}
            variant={selectedTagId === tag.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTagSelect(tag.id)}
            className="gap-1"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
          </Button>
        ))}
      </div>

      {/* 当前筛选状态 */}
      {(selectedTagId || search) && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">当前筛选:</span>
          {selectedTagId && selectedTag && (
            <Badge
              variant="outline"
              className="gap-1"
              style={{
                borderColor: selectedTag.color,
                color: selectedTag.color,
              }}
            >
              {selectedTag.name}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onTagSelect(undefined)}
              />
            </Badge>
          )}
          {search && (
            <Badge variant="outline" className="gap-1">
              &quot;{search}&quot;
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setSearch('')
                  onSearch('')
                }}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground"
          >
            清除筛选
          </Button>
        </div>
      )}
    </div>
  )
}
