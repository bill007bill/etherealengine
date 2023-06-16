import React, { useCallback, useEffect, useRef, useState } from 'react'
import { IoMdChatboxes } from 'react-icons/io'
import { MdModeEditOutline } from 'react-icons/md'
import { MdOutlineGroupAdd } from 'react-icons/md'
import { MdDelete } from 'react-icons/md'

import { Invitation } from './Invitation'
import { ViewMember } from './ViewMember'

export const GroupEdit = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen)
  }

  const [activeModal, setActiveModal] = useState<number | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const openModal = (modalId: number) => {
    setActiveModal(modalId)
  }

  const closeModal = useCallback((modalId?: number) => {
    setActiveModal(modalId as number)
  }, [])

  const handleOutsideClick = useCallback(
    (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        closeModal()
      }
    },
    [modalRef, closeModal]
  )

  useEffect(() => {
    if (activeModal) {
      document.addEventListener('mousedown', handleOutsideClick)
    } else {
      document.removeEventListener('mousedown', handleOutsideClick)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [activeModal, handleOutsideClick])

  return (
    <div className="w-[155px] h-[254px] absolute bg-[#919eac] rounded-[5px] items-center justify-center flex flex-wrap">
      <div className="w-[140px] justify-start mt-2 ml-7  flex flex-wrap">
        <button className=" w-[40px] ">
          <IoMdChatboxes className="w-[22px] fill-[#935CFF] h-[30px]" />
        </button>
        <button>
          <p className="text-[16px] font-bold text-white">CHAT</p>
        </button>
      </div>
      <div className="w-[140px] justify-start mt-2 ml-7 flex flex-wrap">
        <button className=" w-[40px] ">
          <MdModeEditOutline className="w-[22px] fill-[#444546] h-[30px]" />
        </button>
        <button>
          <p className="text-[16px] font-bold text-white">EDIT</p>
        </button>
      </div>
      <div className="w-[140px] justify-start mt-2 ml-7 flex flex-wrap">
        <button className=" w-[40px] ">
          <MdOutlineGroupAdd className="w-[22px] h-[30px] fill-[#57C290]" />
        </button>
        <button onClick={() => openModal(1)}>
          {' '}
          <p className="text-[16px] font-bold text-white">INVITE</p>
          {activeModal === 1 && (
            <div
              ref={modalRef}
              className="fixed w-full h-[100vh] inset-0 flex bg-black  items-center justify-center bg-opacity-50"
              style={{ zIndex: 1 }}
            >
              <Invitation />
            </div>
          )}
        </button>
      </div>
      <div className="w-[140px] justify-start mt-2 ml-7 flex flex-wrap">
        <button className=" w-[40px] ">
          <MdDelete className="w-[22px] h-[30px] fill-[#DD3333]" />
        </button>
        <button>
          {' '}
          <p className="text-[16px] font-bold text-white">DELETE</p>
        </button>
      </div>

      <div className="w-[330px] mt-5 flex justify-center items-center my-4">
        <button className="cursor-pointer rounded-[20px] p-0 bg-[#3F3960] w-[120px] h-8" onClick={toggleDrawer}>
          <div className="[text-align-last:center] rounded-2xl text-[16px] text-sm font-segoe-ui text-white text-left">
            VIEW MEMBERS
          </div>
        </button>
        {isDrawerOpen && (
          <div className="fixed inset-0 flex z-50">
            <div className="bg-gray-500 bg-opacity-50 flex-1" onClick={toggleDrawer}></div>
            <ViewMember />
          </div>
        )}
      </div>
    </div>
  )
}
